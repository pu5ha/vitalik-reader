const MAX_CONTENT_LENGTH = 100000 // ~100k chars to stay within context limits

function truncateContent(content) {
  if (content.length <= MAX_CONTENT_LENGTH) {
    return { content, truncated: false }
  }
  return {
    content: content.slice(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated due to length...]',
    truncated: true
  }
}

async function callClaude(messages, system, apiKey) {
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('API key required. Please enter your Claude API key.')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system,
      messages
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your VITE_ANTHROPIC_API_KEY.')
    }
    if (response.status === 429) {
      throw new Error('Rate limited. Please wait a moment and try again.')
    }
    throw new Error(error.error?.message || `API request failed: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0].text
}

export async function generateSummary(content, title) {
  const { content: truncatedContent, truncated } = truncateContent(content)

  const system = `You are an expert at analyzing Vitalik's blog posts on blockchain, cryptography, and economics. You provide clear, concise summaries that make complex topics accessible. Refer to the author as "Vitalik", never "the author" or "Vitalik Buterin".`

  const prompt = `Analyze this blog post by Vitalik titled "${title}" and provide a structured summary.

IMPORTANT: Refer to the author as "Vitalik", never "the author" or "Vitalik Buterin".

Blog Content:
${truncatedContent}

${truncated ? '\nNote: This content was truncated due to length. Analyze what is available.' : ''}

Respond in the following JSON format only (no markdown code blocks, just the raw JSON):
{
  "theme": "A one-sentence description of the main theme/topic",
  "summary": "A 2-3 paragraph summary of the key points and arguments. Use 'Vitalik' not 'the author'.",
  "takeaways": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3", "Key takeaway 4", "Key takeaway 5"],
  "controversial": ["Any potentially controversial or debatable point 1", "Point 2"]
}

If there are no controversial points, use an empty array for "controversial".`

  const response = await callClaude([{ role: 'user', content: prompt }], system)

  try {
    // Try to parse JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('Invalid response format')
  } catch (e) {
    // If parsing fails, create a structured response from the text
    return {
      theme: 'Analysis of the blog post',
      summary: response,
      takeaways: ['See summary above'],
      controversial: []
    }
  }
}

export async function chatWithBlog(content, title, question, previousMessages = [], apiKey) {
  const { content: truncatedContent } = truncateContent(content)

  const system = `You are a helpful assistant that answers questions about Vitalik Buterin's blog posts. You have access to the full content of the blog post and can answer questions about it. Be concise but thorough. If the question is not related to the blog post, politely redirect the conversation back to the blog's content.

Blog Title: ${title}

Blog Content:
${truncatedContent}`

  // Convert previous messages to Claude format
  const messages = previousMessages.map(msg => ({
    role: msg.role,
    content: msg.content
  }))

  // Add the new question
  messages.push({ role: 'user', content: question })

  return await callClaude(messages, system, apiKey)
}
