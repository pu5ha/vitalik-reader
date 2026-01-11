import express from 'express'
import { body, param, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { ethers } from 'ethers'
import Comment from '../models/Comment.js'
import Vote from '../models/Vote.js'
import { verifySignature, validateTimestamp } from '../middleware/verifySignature.js'
import { resolveENS } from '../utils/ensResolver.js'

const router = express.Router()

// Helper function to sanitize comment content (strip HTML tags)
const sanitizeContent = (content) => {
  return content.replace(/<[^>]*>/g, '').trim()
}

// Rate limiter for comment posting (20 requests per 15 minutes per IP)
const postCommentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many comment requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter for edit/delete (10 requests per 15 minutes per IP)
const editDeleteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many edit/delete requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiter for voting (30 requests per 15 minutes per IP)
const voteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many vote requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/comments/post
// Create a new comment or reply
router.post('/post',
  postCommentRateLimit,
  [
    body('blogId').isString().trim().notEmpty(),
    body('content').isString().trim().notEmpty().isLength({ min: 1, max: 2000 }),
    body('parentCommentId').custom((value) => {
      if (value === null || value === undefined) {
        return true // Allow null/undefined for top-level comments
      }
      if (typeof value === 'string' && value.length > 0) {
        return true // Allow non-empty strings for replies
      }
      throw new Error('Must be null or a non-empty string')
    }),
    body('userAddress').isEthereumAddress(),
    body('signature').isString().matches(/^0x[a-fA-F0-9]{130}$/),
    body('message').isString().notEmpty(),
  ],
  async (req, res) => {
    console.log('POST /post received:', {
      blogId: req.body.blogId,
      contentLength: req.body.content?.length,
      userAddress: req.body.userAddress,
      signatureLength: req.body.signature?.length,
      signatureFormat: req.body.signature?.substring(0, 10) + '...',
      hasMessage: !!req.body.message
    })

    // Validate input
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array())
      const firstError = errors.array()[0]
      return res.status(400).json({
        error: `${firstError.path}: ${firstError.msg}`,
        details: errors.array()
      })
    }

    const { blogId, content, parentCommentId, userAddress, signature, message } = req.body

    try {
      // 1. Validate timestamp (within 5 minutes)
      const timestampValidation = validateTimestamp(message)
      if (!timestampValidation.valid) {
        console.error('Timestamp validation failed:', timestampValidation.error)
        return res.status(400).json({ error: timestampValidation.error })
      }

      // 2. Validate blogId is in message
      if (!message.includes(`Blog ID: ${blogId}`)) {
        return res.status(400).json({ error: 'Blog ID mismatch in message' })
      }

      // 3. Verify signature
      const isValid = verifySignature(message, signature, userAddress)
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      // 4. Sanitize content
      const sanitizedContent = sanitizeContent(content)
      if (sanitizedContent.length === 0) {
        return res.status(400).json({ error: 'Comment content cannot be empty' })
      }

      // 5. Determine depth and validate nesting
      let depth = 0
      if (parentCommentId) {
        const parentComment = await Comment.findOne({ commentId: parentCommentId })
        if (!parentComment) {
          return res.status(404).json({ error: 'Parent comment not found' })
        }
        if (parentComment.depth !== 0) {
          return res.status(400).json({ error: 'Cannot reply to a reply (max 2 levels)' })
        }
        depth = 1
      }

      // 6. Compute message hash
      const messageHash = ethers.hashMessage(message)

      // 7. Resolve ENS name
      const ensName = await resolveENS(userAddress)

      // 8. Create comment
      const comment = new Comment({
        blogId,
        content: sanitizedContent,
        userAddress: userAddress.toLowerCase(),
        ensName,
        parentCommentId: parentCommentId || null,
        depth,
        signature,
        messageHash
      })

      await comment.save()

      res.json({
        success: true,
        comment: {
          commentId: comment.commentId,
          content: comment.content,
          userAddress: comment.userAddress,
          ensName: comment.ensName,
          depth: comment.depth,
          parentCommentId: comment.parentCommentId,
          upvoteCount: comment.upvoteCount,
          downvoteCount: comment.downvoteCount,
          score: comment.score,
          createdAt: comment.createdAt,
          isEdited: comment.isEdited,
          isDeleted: comment.isDeleted
        }
      })
    } catch (error) {
      console.error('Post comment error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// GET /api/comments/:blogId
// Fetch all comments for a blog post with nested replies
router.get('/:blogId',
  [
    param('blogId').isString().trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { blogId } = req.params
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    const sortBy = req.query.sortBy || 'score' // 'score' or 'recent'

    try {
      // Determine sort order
      const sortField = sortBy === 'recent' ? { createdAt: -1 } : { score: -1, createdAt: -1 }

      // 1. Fetch top-level comments (depth=0)
      const topLevelComments = await Comment.find({
        blogId,
        depth: 0
      })
        .sort(sortField)
        .skip(offset)
        .limit(Math.min(limit, 100)) // Max 100 per request
        .select('-signature -messageHash -__v')

      // 2. Get total count
      const totalComments = await Comment.countDocuments({ blogId })

      // 3. For each top-level comment, fetch its replies
      const commentsWithReplies = await Promise.all(
        topLevelComments.map(async (comment) => {
          const replies = await Comment.find({
            parentCommentId: comment.commentId,
            depth: 1
          })
            .sort({ createdAt: 1 }) // Replies sorted chronologically
            .select('-signature -messageHash -__v')

          return {
            commentId: comment.commentId,
            content: comment.content,
            userAddress: comment.userAddress,
            ensName: comment.ensName,
            isEdited: comment.isEdited,
            isDeleted: comment.isDeleted,
            depth: comment.depth,
            parentCommentId: comment.parentCommentId,
            upvoteCount: comment.upvoteCount,
            downvoteCount: comment.downvoteCount,
            score: comment.score,
            createdAt: comment.createdAt,
            editedAt: comment.editedAt,
            replies: replies.map(reply => ({
              commentId: reply.commentId,
              content: reply.content,
              userAddress: reply.userAddress,
              ensName: reply.ensName,
              isEdited: reply.isEdited,
              isDeleted: reply.isDeleted,
              depth: reply.depth,
              parentCommentId: reply.parentCommentId,
              upvoteCount: reply.upvoteCount,
              downvoteCount: reply.downvoteCount,
              score: reply.score,
              createdAt: reply.createdAt,
              editedAt: reply.editedAt
            }))
          }
        })
      )

      res.json({
        blogId,
        totalComments,
        comments: commentsWithReplies
      })
    } catch (error) {
      console.error('Get comments error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// PATCH /api/comments/:commentId
// Edit own comment
router.patch('/:commentId',
  editDeleteRateLimit,
  [
    param('commentId').isString().trim().notEmpty(),
    body('content').isString().trim().notEmpty().isLength({ min: 1, max: 2000 }),
    body('userAddress').isEthereumAddress(),
    body('signature').isString().matches(/^0x[a-fA-F0-9]{130}$/),
    body('message').isString().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { commentId } = req.params
    const { content, userAddress, signature, message } = req.body

    try {
      // 1. Validate timestamp
      const timestampValidation = validateTimestamp(message)
      if (!timestampValidation.valid) {
        return res.status(400).json({ error: timestampValidation.error })
      }

      // 2. Verify signature
      const isValid = verifySignature(message, signature, userAddress)
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      // 3. Find comment
      const comment = await Comment.findOne({ commentId })
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' })
      }

      // 4. Verify ownership
      if (comment.userAddress !== userAddress.toLowerCase()) {
        return res.status(403).json({ error: 'Not authorized to edit this comment' })
      }

      // 5. Verify comment is not deleted
      if (comment.isDeleted) {
        return res.status(400).json({ error: 'Cannot edit deleted comment' })
      }

      // 6. Sanitize content
      const sanitizedContent = sanitizeContent(content)
      if (sanitizedContent.length === 0) {
        return res.status(400).json({ error: 'Comment content cannot be empty' })
      }

      // 7. Update comment
      comment.content = sanitizedContent
      comment.isEdited = true
      comment.editedAt = new Date()
      await comment.save()

      res.json({
        success: true,
        comment: {
          commentId: comment.commentId,
          content: comment.content,
          isEdited: comment.isEdited,
          editedAt: comment.editedAt
        }
      })
    } catch (error) {
      console.error('Edit comment error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// DELETE /api/comments/:commentId
// Delete own comment (soft delete if has replies, hard delete otherwise)
router.delete('/:commentId',
  editDeleteRateLimit,
  [
    param('commentId').isString().trim().notEmpty(),
    body('userAddress').isEthereumAddress(),
    body('signature').isString().matches(/^0x[a-fA-F0-9]{130}$/),
    body('message').isString().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { commentId } = req.params
    const { userAddress, signature, message } = req.body

    try {
      // 1. Validate timestamp
      const timestampValidation = validateTimestamp(message)
      if (!timestampValidation.valid) {
        return res.status(400).json({ error: timestampValidation.error })
      }

      // 2. Verify signature
      const isValid = verifySignature(message, signature, userAddress)
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      // 3. Find comment
      const comment = await Comment.findOne({ commentId })
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' })
      }

      // 4. Verify ownership
      if (comment.userAddress !== userAddress.toLowerCase()) {
        return res.status(403).json({ error: 'Not authorized to delete this comment' })
      }

      // 5. Check if comment has replies
      const hasReplies = await Comment.countDocuments({ parentCommentId: commentId }) > 0

      let deletionType
      if (hasReplies) {
        // Soft delete: Keep comment but mark as deleted
        comment.content = '[deleted]'
        comment.isDeleted = true
        await comment.save()
        deletionType = 'soft'
      } else {
        // Hard delete: Remove comment and its votes
        await Comment.deleteOne({ commentId })
        await Vote.deleteMany({ commentId })
        deletionType = 'hard'
      }

      res.json({
        success: true,
        deletionType
      })
    } catch (error) {
      console.error('Delete comment error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// POST /api/comments/vote
// Upvote or downvote a comment
router.post('/vote',
  voteRateLimit,
  [
    body('commentId').isString().trim().notEmpty(),
    body('voteType').isIn(['upvote', 'downvote']),
    body('userAddress').isEthereumAddress(),
    body('signature').isString().matches(/^0x[a-fA-F0-9]{130}$/),
    body('message').isString().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { commentId, voteType, userAddress, signature, message } = req.body

    try {
      // 1. Validate timestamp
      const timestampValidation = validateTimestamp(message)
      if (!timestampValidation.valid) {
        return res.status(400).json({ error: timestampValidation.error })
      }

      // 2. Verify signature
      const isValid = verifySignature(message, signature, userAddress)
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      // 3. Find comment
      const comment = await Comment.findOne({ commentId })
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' })
      }

      // 4. Check if user already voted
      const existingVote = await Vote.findOne({
        commentId,
        userAddress: userAddress.toLowerCase()
      })

      if (existingVote) {
        // User already voted
        if (existingVote.voteType === voteType) {
          return res.status(400).json({ error: 'Already voted with this type' })
        }

        // Change vote: decrement old count, increment new count
        if (existingVote.voteType === 'upvote') {
          comment.upvoteCount = Math.max(0, comment.upvoteCount - 1)
          comment.downvoteCount += 1
        } else {
          comment.downvoteCount = Math.max(0, comment.downvoteCount - 1)
          comment.upvoteCount += 1
        }

        // Update vote type
        existingVote.voteType = voteType
        await existingVote.save()
      } else {
        // New vote: create vote, increment count
        const vote = new Vote({
          commentId,
          userAddress: userAddress.toLowerCase(),
          voteType
        })
        await vote.save()

        if (voteType === 'upvote') {
          comment.upvoteCount += 1
        } else {
          comment.downvoteCount += 1
        }
      }

      // Update score
      comment.score = comment.upvoteCount - comment.downvoteCount
      await comment.save()

      res.json({
        success: true,
        newScore: comment.score,
        userVote: voteType,
        upvoteCount: comment.upvoteCount,
        downvoteCount: comment.downvoteCount
      })
    } catch (error) {
      console.error('Vote error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// DELETE /api/comments/vote/:commentId
// Remove vote from a comment
router.delete('/vote/:commentId',
  voteRateLimit,
  [
    param('commentId').isString().trim().notEmpty(),
    body('userAddress').isEthereumAddress(),
    body('signature').isString().matches(/^0x[a-fA-F0-9]{130}$/),
    body('message').isString().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { commentId } = req.params
    const { userAddress, signature, message } = req.body

    try {
      // 1. Validate timestamp
      const timestampValidation = validateTimestamp(message)
      if (!timestampValidation.valid) {
        return res.status(400).json({ error: timestampValidation.error })
      }

      // 2. Verify signature
      const isValid = verifySignature(message, signature, userAddress)
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      // 3. Find vote
      const vote = await Vote.findOne({
        commentId,
        userAddress: userAddress.toLowerCase()
      })

      if (!vote) {
        return res.status(404).json({ error: 'Vote not found' })
      }

      // 4. Find comment and decrement count
      const comment = await Comment.findOne({ commentId })
      if (comment) {
        if (vote.voteType === 'upvote') {
          comment.upvoteCount = Math.max(0, comment.upvoteCount - 1)
        } else {
          comment.downvoteCount = Math.max(0, comment.downvoteCount - 1)
        }
        comment.score = comment.upvoteCount - comment.downvoteCount
        await comment.save()
      }

      // 5. Delete vote
      await Vote.deleteOne({ _id: vote._id })

      res.json({
        success: true,
        newScore: comment ? comment.score : 0
      })
    } catch (error) {
      console.error('Remove vote error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
