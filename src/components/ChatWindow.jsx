import { useState, useRef, useEffect } from 'react'
import { chatWithBlog } from '../utils/anthropic'

function ChatWindow({ blog }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState(localStorage.getItem('userClaudeApiKey') || '')
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem('userClaudeApiKey'))
  const messagesEndRef = useRef(null)

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('userClaudeApiKey', apiKey.trim())
      setShowApiKeyInput(false)
      setError(null)
    }
  }

  const clearApiKey = () => {
    localStorage.removeItem('userClaudeApiKey')
    setApiKey('')
    setShowApiKeyInput(true)
    setMessages([])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userApiKey = localStorage.getItem('userClaudeApiKey')
    if (!userApiKey) {
      setError('Please enter your Claude API key first')
      setShowApiKeyInput(true)
      return
    }

    const userMessage = input.trim()
    setInput('')
    setError(null)

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    setLoading(true)
    try {
      const response = await chatWithBlog(blog.content, blog.title, userMessage, messages, userApiKey)
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch (err) {
      setError(err.message)
      if (err.message.includes('API key') || err.message.includes('401')) {
        setShowApiKeyInput(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const suggestedQuestions = [
    "What is the central argument?",
    "Explain the technical concepts",
    "What are the broader implications?",
    "How does this connect to Ethereum?"
  ]

  const handleSuggestion = (question) => {
    setInput(question)
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>Discuss this essay</h3>
        <p className="chat-subtitle">Ask questions, powered by Claude</p>
        {!showApiKeyInput && (
          <button
            onClick={() => setShowApiKeyInput(true)}
            className="api-key-settings-btn"
            title="Change API key"
          >
            ⚙️
          </button>
        )}
      </div>

      {showApiKeyInput && (
        <div className="api-key-input-container">
          <p className="api-key-label">Enter your Claude API key:</p>
          <p className="api-key-hint">
            Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="api-key-input"
            onKeyPress={(e) => e.key === 'Enter' && saveApiKey()}
          />
          <div className="api-key-buttons">
            <button onClick={saveApiKey} className="save-api-key-btn">
              Save Key
            </button>
            {localStorage.getItem('userClaudeApiKey') && (
              <button onClick={clearApiKey} className="clear-api-key-btn">
                Clear Key
              </button>
            )}
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p>What would you like to explore?</p>
            <div className="suggested-questions">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  className="suggestion-btn"
                  onClick={() => handleSuggestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant loading">
            <div className="message-content">
              <span className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error">
            <p>{error}</p>
            {error.includes('API key') && (
              <p className="error-hint">Add your Anthropic API key to .env file</p>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
          className="chat-input"
        />
        <button type="submit" disabled={loading || !input.trim()} className="send-btn">
          Send
        </button>
      </form>
    </div>
  )
}

export default ChatWindow
