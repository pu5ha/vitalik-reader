import mongoose from 'mongoose'

const signatureSchema = new mongoose.Schema({
  userAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  blogId: {
    type: String,
    required: true,
    index: true
  },
  signature: {
    type: String,
    required: true
  },
  signedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  ensName: {
    type: String,
    default: null
  },
  messageHash: {
    type: String,
    required: true
  }
}, {
  timestamps: true
})

// Compound unique index to prevent duplicate signatures
signatureSchema.index({ userAddress: 1, blogId: 1 }, { unique: true })

// Index for fetching all readers for a blog (sorted by signedAt descending)
signatureSchema.index({ blogId: 1, signedAt: -1 })

// Index for fetching all blogs signed by a user (future user profile feature)
signatureSchema.index({ userAddress: 1, signedAt: -1 })

const Signature = mongoose.model('Signature', signatureSchema)

export default Signature
