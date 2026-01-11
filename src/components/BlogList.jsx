import { useState, useMemo } from 'react'
import BlogCard from './BlogCard'

function BlogList({ blogs }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = useMemo(() => {
    const cats = [...new Set(blogs.map(b => b.category))]
    return ['all', ...cats.sort()]
  }, [blogs])

  const filteredBlogs = useMemo(() => {
    return blogs.filter(blog => {
      const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (blog.summary && blog.summary.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = selectedCategory === 'all' || blog.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [blogs, searchTerm, selectedCategory])

  return (
    <div className="blog-list-container">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <h1>Vitalik's Essays</h1>
          </div>
          <p className="tagline">Read, discuss, and engage with Vitalik's essays on crypto, society, and technology</p>
        </div>
      </header>

      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search essays..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="category-filters">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="blog-count">
        {filteredBlogs.length} essay{filteredBlogs.length !== 1 ? 's' : ''}
      </div>

      <div className="blog-list">
        {filteredBlogs.map(blog => (
          <BlogCard key={blog.id} blog={blog} />
        ))}
      </div>

      {filteredBlogs.length === 0 && (
        <div className="no-results">
          <p>No essays found matching your search</p>
        </div>
      )}
    </div>
  )
}

export default BlogList
