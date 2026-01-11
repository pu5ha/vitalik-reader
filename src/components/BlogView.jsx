import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback } from 'react'
import SummaryPanel from './SummaryPanel'
import WalletConnect from './WalletConnect'
import SignBlogButton from './SignBlogButton'
import ReadersPanel from './ReadersPanel'

function BlogView({ blogs }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('summary')
  const [readers, setReaders] = useState([])
  const [loadingReaders, setLoadingReaders] = useState(false)

  const blog = useMemo(() => {
    return blogs.find(b => b.id === id)
  }, [blogs, id])

  const fetchReaders = useCallback(async () => {
    if (!blog?.id) return

    setLoadingReaders(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/signatures/${blog.id}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setReaders(data.signatures || [])
    } catch (error) {
      console.error('Failed to fetch readers:', error)
      setReaders([])
    } finally {
      setLoadingReaders(false)
    }
  }, [blog?.id])

  useEffect(() => {
    if (activeTab === 'readers') {
      fetchReaders()
    }
  }, [activeTab, fetchReaders])

  if (!blog) {
    return (
      <div className="error-container">
        <div className="error-card">
          <h2>Essay Not Found</h2>
          <p>The requested essay could not be found.</p>
          <Link to="/" className="back-link">Back to all essays</Link>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getReadTime = (content) => {
    if (!content) return '?'
    const words = content.split(/\s+/).length
    return Math.ceil(words / 200)
  }

  return (
    <div className="blog-view-container">
      <header className="blog-header">
        <div className="blog-header-top">
          <Link to="/" className="back-btn">Back to essays</Link>
          <WalletConnect />
        </div>
        <div className="blog-meta">
          <span className="blog-category">{blog.category}</span>
          <span className="blog-date">{formatDate(blog.date)}</span>
          <span className="blog-date">{getReadTime(blog.content)} min read</span>
        </div>
        <h1 className="blog-title">{blog.title}</h1>
        <div className="blog-actions">
          <a href={blog.url} target="_blank" rel="noopener noreferrer" className="original-link">
            View Original
          </a>
          <SignBlogButton blog={blog} onSigned={fetchReaders} />
          <button
            className="read-mode-btn"
            onClick={() => navigate(`/read/${blog.id}`)}
          >
            Enter Read Mode
          </button>
        </div>
      </header>

      <div className="blog-tabs">
        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`tab-btn ${activeTab === 'readers' ? 'active' : ''}`}
          onClick={() => setActiveTab('readers')}
        >
          Readers ({readers.length})
        </button>
      </div>

      <div className="blog-view-content">
        {activeTab === 'summary' && <SummaryPanel blog={blog} />}
        {activeTab === 'readers' && (
          <ReadersPanel
            readers={readers}
            loading={loadingReaders}
            blogId={blog.id}
          />
        )}
      </div>
    </div>
  )
}

export default BlogView
