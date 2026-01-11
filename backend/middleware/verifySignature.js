import { ethers } from 'ethers'

export const verifySignature = (message, signature, address) => {
  try {
    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature)

    // Compare addresses (case-insensitive)
    return recoveredAddress.toLowerCase() === address.toLowerCase()
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

export const validateTimestamp = (message) => {
  try {
    // Extract timestamp from message
    // Format: "I have read: {title}\nBlog ID: {blogId}\nTimestamp: {timestamp}"
    const timestampMatch = message.match(/Timestamp:\s*(\d+)/)

    if (!timestampMatch) {
      return { valid: false, error: 'Timestamp not found in message' }
    }

    const timestamp = parseInt(timestampMatch[1])
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    // Check if timestamp is within 5 minutes (past or future for clock skew)
    if (Math.abs(now - timestamp) > fiveMinutes) {
      return { valid: false, error: 'Timestamp too old or invalid' }
    }

    return { valid: true, timestamp }
  } catch (error) {
    return { valid: false, error: 'Invalid timestamp format' }
  }
}

export const validateBlogId = (message, expectedBlogId) => {
  try {
    // Extract blogId from message
    const blogIdMatch = message.match(/Blog ID:\s*([^\n]+)/)

    if (!blogIdMatch) {
      return { valid: false, error: 'Blog ID not found in message' }
    }

    const extractedBlogId = blogIdMatch[1].trim()

    if (extractedBlogId !== expectedBlogId) {
      return { valid: false, error: 'Blog ID mismatch' }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Invalid blog ID format' }
  }
}
