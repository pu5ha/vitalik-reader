import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

const commentSchema = new mongoose.Schema({
  commentId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    required: true,
    index: true
  },
  blogId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  userAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  ensName: {
    type: String,
    default: null
  },
  parentCommentId: {
    type: String,
    default: null,
    index: true
  },
  depth: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    index: true
  },
  signature: {
    type: String,
    required: true
  },
  messageHash: {
    type: String,
    required: true
  },
  upvoteCount: {
    type: Number,
    default: 0,
    min: 0
  },
  downvoteCount: {
    type: Number,
    default: 0,
    min: 0
  },
  score: {
    type: Number,
    default: 0,
    index: true
  },
  editedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
})

// Compound index for fetching top-level comments sorted by score
commentSchema.index({ blogId: 1, depth: 1, score: -1 })

// Index for fetching replies to a comment
commentSchema.index({ parentCommentId: 1, createdAt: 1 })

// Index for fetching all comments by a user (chronological)
commentSchema.index({ userAddress: 1, createdAt: -1 })

// Index for fetching all comments for a blog (chronological)
commentSchema.index({ blogId: 1, createdAt: -1 })

const Comment = mongoose.model('Comment', commentSchema)

export default Comment
