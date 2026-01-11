import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import CommentForm from './CommentForm'

function CommentCard({ comment, blogId, blogTitle, onCommentUpdated, depth, formatDate }) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [userVote, setUserVote] = useState(null) // 'upvote', 'downvote', or null
  const [upvoteCount, setUpvoteCount] = useState(comment.upvoteCount)
  const [downvoteCount, setDownvoteCount] = useState(comment.downvoteCount)
  const [score, setScore] = useState(comment.score)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isVoting, setIsVoting] = useState(false)

  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const isOwnComment = isConnected && address && comment.userAddress === address.toLowerCase()

  const handleVote = async (voteType) => {
    if (!isConnected) {
      alert('Please connect your wallet to vote')
      return
    }

    if (isVoting) return
    setIsVoting(true)

    try {
      const timestamp = Date.now()
      const message = `Vote on comment: ${comment.commentId}\nVote type: ${voteType}\nTimestamp: ${timestamp}`

      const signature = await signMessageAsync({ message })

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/comments/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.commentId,
          voteType,
          userAddress: address,
          signature,
          message
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to vote')
      }

      const data = await response.json()
      setUserVote(data.userVote)
      setUpvoteCount(data.upvoteCount)
      setDownvoteCount(data.downvoteCount)
      setScore(data.newScore)
    } catch (error) {
      console.error('Vote error:', error)
      alert(error.message || 'Failed to vote. Please try again.')
    } finally {
      setIsVoting(false)
    }
  }

  const handleEdit = async () => {
    if (!editContent.trim()) {
      alert('Comment cannot be empty')
      return
    }

    setIsSaving(true)
    try {
      const timestamp = Date.now()
      const message = `Edit comment: ${comment.commentId}\nNew content: ${editContent}\nTimestamp: ${timestamp}`

      const signature = await signMessageAsync({ message })

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/comments/${comment.commentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: editContent,
            userAddress: address,
            signature,
            message
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to edit comment')
      }

      setIsEditing(false)
      onCommentUpdated()
    } catch (error) {
      console.error('Edit error:', error)
      alert('Failed to edit comment. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return
    }

    setIsDeleting(true)
    try {
      const timestamp = Date.now()
      const message = `Delete comment: ${comment.commentId}\nTimestamp: ${timestamp}`

      const signature = await signMessageAsync({ message })

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/comments/${comment.commentId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: address,
            signature,
            message
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete comment')
      }

      onCommentUpdated()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete comment. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReplyPosted = () => {
    setShowReplyForm(false)
    onCommentUpdated()
  }

  return (
    <>
      <div className={`comment-card depth-${depth} ${comment.isDeleted ? 'deleted' : ''}`}>
        {/* Header: Author and timestamp */}
        <div className="comment-header">
          <div className="comment-author">
            <div className="comment-author-name">
              {comment.ensName || formatAddress(comment.userAddress)}
            </div>
            <span className="comment-timestamp">
              {formatDate(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="comment-edited">(edited)</span>
            )}
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="comment-edit-form">
            <textarea
              className="comment-textarea"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={2000}
            />
            <div className="comment-edit-actions">
              <button
                className="post-comment-btn"
                onClick={handleEdit}
                disabled={isSaving || !editContent.trim()}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                className="cancel-reply-btn"
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(comment.content)
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="comment-content">{comment.content}</div>
        )}

        {/* Actions: Vote, Reply, Edit, Delete */}
        {!comment.isDeleted && (
          <div className="comment-actions">
            {/* Vote controls */}
            <div className="vote-controls">
              <button
                className={`vote-btn ${userVote === 'upvote' ? 'active' : ''}`}
                onClick={() => handleVote('upvote')}
                disabled={isVoting || !isConnected}
                title="Upvote"
              >
                ▲
              </button>
              <span className="vote-count">{score}</span>
              <button
                className={`vote-btn ${userVote === 'downvote' ? 'active' : ''}`}
                onClick={() => handleVote('downvote')}
                disabled={isVoting || !isConnected}
                title="Downvote"
              >
                ▼
              </button>
            </div>

            {/* Reply button (only for top-level comments) */}
            {depth === 0 && !isEditing && (
              <button
                className="action-btn"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                💬 Reply
              </button>
            )}

            {/* Edit button (only for own comments) */}
            {isOwnComment && !isEditing && (
              <button
                className="action-btn"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Edit
              </button>
            )}

            {/* Delete button (only for own comments) */}
            {isOwnComment && !isEditing && (
              <button
                className="action-btn"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                🗑️ {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline reply form */}
      {showReplyForm && (
        <div className="inline-reply-form">
          <CommentForm
            blogId={blogId}
            blogTitle={blogTitle}
            parentCommentId={comment.commentId}
            onCommentPosted={handleReplyPosted}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {/* Nested replies (only for depth-0 comments) */}
      {depth === 0 && comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.commentId}
              comment={reply}
              blogId={blogId}
              blogTitle={blogTitle}
              onCommentUpdated={onCommentUpdated}
              depth={1}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </>
  )
}

export default CommentCard
