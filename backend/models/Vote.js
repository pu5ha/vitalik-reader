import mongoose from 'mongoose'

const voteSchema = new mongoose.Schema({
  commentId: {
    type: String,
    required: true,
    index: true
  },
  userAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  voteType: {
    type: String,
    required: true,
    enum: ['upvote', 'downvote']
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
})

// Compound unique index to ensure one vote per wallet per comment
voteSchema.index({ commentId: 1, userAddress: 1 }, { unique: true })

// Index for fetching all votes by a user
voteSchema.index({ userAddress: 1, createdAt: -1 })

const Vote = mongoose.model('Vote', voteSchema)

export default Vote
