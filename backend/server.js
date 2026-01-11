import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { connectDB } from './config/db.js'
import signatureRoutes from './routes/signatures.js'

// Load environment variables
dotenv.config()

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize Express app
const app = express()

// Connect to MongoDB
connectDB()

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Load blogs.json for badge generation
let blogsMap = new Map()
try {
  const blogsPath = join(__dirname, '..', 'public', 'blogs.json')
  const blogsData = JSON.parse(readFileSync(blogsPath, 'utf-8'))
  blogsMap = new Map(blogsData.map(blog => [blog.id, blog]))
  console.log(`Loaded ${blogsMap.size} blogs for badge generation`)
} catch (error) {
  console.error('Warning: Could not load blogs.json:', error.message)
  console.error('Badge generation will not work without blog data')
}

// Store blogs in app.locals for access in routes
app.locals.blogsMap = blogsMap

// Routes
app.use('/api/signatures', signatureRoutes)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    blogsLoaded: blogsMap.size
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`)
})
