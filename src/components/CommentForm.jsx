import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

function CommentForm({ blogId, blogTitle, parentCommentId, onCommentPosted, onCancel }) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [content, setContent] = useState('')
  const [isPosting, setIsPosting] = useState(false)

  const MAX_LENGTH = 2000
  const charCount = content.length
  const isOverLimit = charCount > MAX_LENGTH
  const isNearLimit = charCount > MAX_LENGTH * 0.9

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isConnected) {
      alert('Please connect your wallet to comment')
      return
    }

    if (!content.trim()) {
      alert('Comment cannot be empty')
      return
    }

    if (isOverLimit) {
      alert(`Comment is too long. Maximum ${MAX_LENGTH} characters allowed.`)
      return
    }

    setIsPosting(true)
    try {
      const timestamp = Date.now()
      const message = `I want to comment on: ${blogTitle}
Blog ID: ${blogId}
Parent Comment: ${parentCommentId || 'none'}
Content: ${content.trim()}
Timestamp: ${timestamp}`

      // Sign message with wallet
      const signature = await signMessageAsync({ message })

      // Send to backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/comments/post`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blogId,
            content: content.trim(),
            parentCommentId,
            userAddress: address,
            signature,
            message
          })
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to post comment')
      }

      // Success - clear form and notify parent
      setContent('')
      onCommentPosted?.()
    } catch (error) {
      console.error('Comment posting failed:', error)
      if (error.message.includes('User rejected')) {
        alert('Signature request was rejected')
      } else {
        alert(error.message || 'Failed to post comment. Please try again.')
      }
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <textarea
        className="comment-textarea"
        placeholder={parentCommentId ? 'Write a reply...' : 'Share your thoughts...'}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isPosting || !isConnected}
        rows={parentCommentId ? 3 : 4}
      />

      <div className="comment-form-footer">
        <div className={`char-counter ${isNearLimit ? 'warning' : ''} ${isOverLimit ? 'error' : ''}`}>
          {charCount} / {MAX_LENGTH}
        </div>

        <div className="comment-form-actions">
          {onCancel && (
            <button
              type="button"
              className="cancel-reply-btn"
              onClick={onCancel}
              disabled={isPosting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="post-comment-btn"
            disabled={isPosting || !isConnected || !content.trim() || isOverLimit}
          >
            {isPosting ? 'Posting...' : parentCommentId ? 'Post Reply' : 'Post Comment'}
          </button>
        </div>
      </div>

      {!isConnected && (
        <p className="comment-form-hint">
          Connect your wallet to post comments
        </p>
      )}
    </form>
  )
}

export default CommentForm
