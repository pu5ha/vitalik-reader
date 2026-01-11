import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import BlogList from './components/BlogList'
import BlogView from './components/BlogView'
import ReadMode from './components/ReadMode'
import Loading from './components/Loading'

function App() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadBlogs() {
      try {
        const response = await fetch('/blogs.json')
        if (!response.ok) throw new Error('Failed to load blogs')
        const data = await response.json()
        setBlogs(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadBlogs()
  }, [])

  if (loading) {
    return <Loading message="Loading Vitalik's blogs..." />
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <h2>Failed to Load Blogs</h2>
          <p>{error}</p>
          <p className="hint">Make sure to run <code>npm run fetch-blogs</code> first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<BlogList blogs={blogs} />} />
        <Route path="/blog/:id" element={<BlogView blogs={blogs} />} />
        <Route path="/read/:id" element={<ReadMode blogs={blogs} />} />
      </Routes>
    </div>
  )
}

export default App
