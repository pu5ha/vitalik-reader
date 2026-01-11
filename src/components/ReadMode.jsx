import { useParams, Link } from 'react-router-dom'
import { useMemo } from 'react'
import ChatWindow from './ChatWindow'
import TextToSpeech from './TextToSpeech'

function ReadMode({ blogs }) {
  const { id } = useParams()

  const blog = useMemo(() => {
    return blogs.find(b => b.id === id)
  }, [blogs, id])

  if (!blog) {
    return (
      <div className="error-container">
        <div className="error-card">
          <h2>Essay Not Found</h2>
          <Link to="/" className="back-link">Back to all essays</Link>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Format content with proper paragraphs and clean up junk
  const formatContent = (content) => {
    if (!content) return []

    // Clean up the content first
    let cleaned = content
      // Remove "Dark Mode Toggle" text
      .replace(/Dark Mode Toggle\s*/g, '')
      // Remove "See all posts" links
      .replace(/See all posts\s*/g, '')
      // Remove empty bullet points at the start (- \n\n- \n\n)
      .replace(/^(-\s*\n\n)*/, '')

    // Split into paragraphs
    let paragraphs = cleaned.split('\n\n').filter(p => p.trim())

    // Skip first few lines if they're duplicates of the title or date
    paragraphs = paragraphs.filter((para, idx) => {
      const trimmed = para.trim()

      // Remove if it's just the title repeated (case-insensitive)
      if (trimmed.toLowerCase() === blog.title.toLowerCase()) return false

      // Remove if it starts with "##" in the first 5 paragraphs
      if (idx < 5 && /^##\s+/.test(trimmed)) {
        const headingText = trimmed.replace(/^##\s+/, '').trim()
        // Remove if heading matches title (case-insensitive)
        if (headingText.toLowerCase() === blog.title.toLowerCase()) return false
      }

      // Remove date lines
      if (/^\d{4}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/.test(trimmed)) return false

      // Remove empty bullet points
      if (trimmed === '-' || trimmed === '- ') return false

      return true
    })

    return paragraphs
  }

  const paragraphs = formatContent(blog.content)

  // Create clean text from paragraphs for TTS (without markdown)
  const cleanTextForSpeech = paragraphs.map(para => {
    // Remove markdown headers
    if (para.startsWith('## ')) {
      return para.replace('## ', '')
    }
    // Remove list bullets
    if (para.startsWith('- ')) {
      return para.split('\n').map(line => line.replace(/^- /, '')).join('. ')
    }
    return para
  }).join('\n\n')

  return (
    <div className="read-mode-container">
      <div className="read-mode-content">
        <header className="read-header">
          <div className="read-header-top">
            <Link to={`/blog/${blog.id}`} className="back-btn">Back to Summary</Link>
            <TextToSpeech text={cleanTextForSpeech} title={blog.title} />
          </div>
          <div className="read-meta">
            <span className="read-category">{blog.category}</span>
            <span className="read-date">{formatDate(blog.date)}</span>
          </div>
          <h1 className="read-title">{blog.title}</h1>
        </header>

        <article className="article-content">
          {paragraphs.map((para, i) => {
            if (para.startsWith('## ')) {
              return <h2 key={i}>{para.replace('## ', '')}</h2>
            }
            if (para.startsWith('- ')) {
              const items = para.split('\n').filter(l => l.startsWith('- '))
              return (
                <ul key={i}>
                  {items.map((item, j) => (
                    <li key={j}>{item.replace('- ', '')}</li>
                  ))}
                </ul>
              )
            }
            return <p key={i}>{para}</p>
          })}
        </article>
      </div>

      <div className="chat-sidebar">
        <ChatWindow blog={blog} />
      </div>
    </div>
  )
}

export default ReadMode
