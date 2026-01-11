import { Link } from 'react-router-dom'

function BlogCard({ blog }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getReadTime = (content) => {
    if (!content) return '?'
    const words = content.split(/\s+/).length
    const minutes = Math.ceil(words / 200)
    return minutes
  }

  return (
    <Link to={`/blog/${blog.id}`} className="blog-row">
      <span className="row-date">{formatDate(blog.date)}</span>
      <div className="row-content">
        <span className="row-category" data-category={blog.category}>{blog.category}</span>
        <span className="row-title">{blog.title}</span>
        {blog.summary && <span className="row-summary">{blog.summary}</span>}
      </div>
      <span className="row-readtime">{getReadTime(blog.content)} min read</span>
    </Link>
  )
}

export default BlogCard
