import express from 'express'
import { body, param, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { ethers } from 'ethers'
import Signature from '../models/Signature.js'
import { verifySignature, validateTimestamp, validateBlogId } from '../middleware/verifySignature.js'
import { resolveENS } from '../utils/ensResolver.js'
import { generateBadge } from '../utils/badgeGenerator.js'

const router = express.Router()

// Rate limiter for signing endpoint (10 requests per 15 minutes per IP)
const signRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many signature requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/signatures/sign
// Record a user's signature for reading a blog post
router.post('/sign',
  signRateLimit,
  [
    body('blogId').isString().trim().notEmpty(),
    body('userAddress').isEthereumAddress(),
    body('signature').isString().matches(/^0x[a-fA-F0-9]{130}$/),
    body('message').isString().notEmpty(),
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { blogId, userAddress, signature, message } = req.body

    try {
      // 1. Validate timestamp (within 5 minutes)
      const timestampValidation = validateTimestamp(message)
      if (!timestampValidation.valid) {
        return res.status(400).json({ error: timestampValidation.error })
      }

      // 2. Validate blogId matches message
      const blogIdValidation = validateBlogId(message, blogId)
      if (!blogIdValidation.valid) {
        return res.status(400).json({ error: blogIdValidation.error })
      }

      // 3. Verify signature
      const isValid = verifySignature(message, signature, userAddress)
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      // 4. Compute message hash
      const messageHash = ethers.hashMessage(message)

      // 5. Resolve ENS name (if not already cached)
      let ensName = null
      const existingSignature = await Signature.findOne({
        userAddress: userAddress.toLowerCase(),
        blogId
      })

      if (existingSignature && existingSignature.ensName) {
        ensName = existingSignature.ensName
      } else {
        ensName = await resolveENS(userAddress)
      }

      // 6. Upsert signature (update if exists, insert if not)
      const signatureDoc = await Signature.findOneAndUpdate(
        {
          userAddress: userAddress.toLowerCase(),
          blogId
        },
        {
          signature,
          signedAt: new Date(),
          ensName,
          messageHash
        },
        {
          upsert: true,
          new: true
        }
      )

      res.json({
        success: true,
        signature: {
          userAddress: signatureDoc.userAddress,
          blogId: signatureDoc.blogId,
          signedAt: signatureDoc.signedAt,
          ensName: signatureDoc.ensName
        }
      })
    } catch (error) {
      console.error('Sign endpoint error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// GET /api/signatures/:blogId
// Get all users who signed a specific blog
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
    const limit = parseInt(req.query.limit) || 100
    const offset = parseInt(req.query.offset) || 0

    try {
      const signatures = await Signature.find({ blogId })
        .sort({ signedAt: -1 })
        .skip(offset)
        .limit(Math.min(limit, 100)) // Max 100 per request
        .select('userAddress ensName signedAt signature -_id')

      const count = await Signature.countDocuments({ blogId })

      res.json({
        blogId,
        count,
        signatures
      })
    } catch (error) {
      console.error('Get signatures error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// GET /api/badges/:blogId/:address
// Generate and return badge image
router.get('/badges/:blogId/:address',
  [
    param('blogId').isString().trim().notEmpty(),
    param('address').isEthereumAddress(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { blogId, address } = req.params

    try {
      // Fetch signature
      const signature = await Signature.findOne({
        blogId,
        userAddress: address.toLowerCase()
      })

      if (!signature) {
        return res.status(404).json({ error: 'Signature not found' })
      }

      console.log('Badge route - signature data:', {
        userAddress: signature.userAddress,
        ensName: signature.ensName,
        hasSignature: !!signature.signature,
        signaturePreview: signature.signature?.slice(0, 20)
      })

      // Fetch blog data from request context (set by server.js)
      const blog = req.app.locals.blogsMap.get(blogId)
      if (!blog) {
        return res.status(404).json({ error: 'Blog not found' })
      }

      // Generate badge
      const badgeBuffer = await generateBadge(
        {
          address: signature.userAddress,
          ensName: signature.ensName,
          signedAt: signature.signedAt,
          signature: signature.signature
        },
        {
          title: blog.title,
          date: blog.date
        }
      )

      res.set('Content-Type', 'image/png')
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate') // No cache for now
      res.send(badgeBuffer)
    } catch (error) {
      console.error('Badge generation error:', error)
      res.status(500).json({ error: 'Failed to generate badge' })
    }
  }
)

export default router
