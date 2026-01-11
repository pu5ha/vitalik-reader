import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import CommentCard from './CommentCard'
import CommentForm from './CommentForm'

function CommentsPanel({ blogId, blogTitle }) {
  const { address, isConnected } = useAccount()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('score') // 'score' or 'recent'
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalComments, setTotalComments] = useState(0)

  const fetchComments = async (reset = false) => {
    setLoading(true)
    try {
      const currentOffset = reset ? 0 : offset
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/comments/${blogId}?sortBy=${sortBy}&limit=50&offset=${currentOffset}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (reset) {
        setComments(data.comments || [])
        setOffset(0)
      } else {
        setComments(prev => [...prev, ...(data.comments || [])])
      }

      setTotalComments(data.totalComments || 0)
      setHasMore(currentOffset + (data.comments || []).length < data.totalComments)
    } catch (error) {
      console.error('Failed to fetch comments:', error)
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComments(true)
  }, [blogId, sortBy])

  const handleCommentPosted = () => {
    fetchComments(true)
  }

  const handleCommentUpdated = () => {
    fetchComments(true)
  }

  const handleLoadMore = () => {
    setOffset(prev => prev + 50)
    fetchComments(false)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && comments.length === 0) {
    return <div className="comments-panel loading">Loading comments...</div>
  }

  return (
    <div className="comments-panel">
      {/* Header with count and sort toggle */}
      <div className="comments-header">
        <div className="comments-count">
          {totalComments} comment{totalComments !== 1 ? 's' : ''}
        </div>
        <div className="comments-sort">
          <button
            className={`sort-btn ${sortBy === 'score' ? 'active' : ''}`}
            onClick={() => setSortBy('score')}
          >
            Top
          </button>
          <button
            className={`sort-btn ${sortBy === 'recent' ? 'active' : ''}`}
            onClick={() => setSortBy('recent')}
          >
            Recent
          </button>
        </div>
      </div>

      {/* Comment form for posting new comments */}
      <CommentForm
        blogId={blogId}
        blogTitle={blogTitle}
        parentCommentId={null}
        onCommentPosted={handleCommentPosted}
        onCancel={null}
      />

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="comments-empty">
          <p>No comments yet.</p>
          <p className="hint">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <>
          <div className="comments-list">
            {comments.map((comment) => (
              <CommentCard
                key={comment.commentId}
                comment={comment}
                blogId={blogId}
                blogTitle={blogTitle}
                onCommentUpdated={handleCommentUpdated}
                depth={0}
                formatDate={formatDate}
              />
            ))}
          </div>

          {/* Load more button */}
          {hasMore && !loading && (
            <button
              className="load-more-btn"
              onClick={handleLoadMore}
            >
              Load More Comments
            </button>
          )}

          {loading && comments.length > 0 && (
            <div className="loading-more">Loading...</div>
          )}
        </>
      )}
    </div>
  )
}

export default CommentsPanel
