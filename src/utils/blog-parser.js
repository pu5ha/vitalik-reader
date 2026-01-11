// Utility functions for parsing blog content

export function parseMarkdown(content) {
  if (!content) return []

  const sections = []
  const lines = content.split('\n')
  let currentSection = { type: 'paragraph', content: [] }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection.content.length > 0) {
        sections.push(currentSection)
      }
      sections.push({ type: 'heading', content: line.replace('## ', '') })
      currentSection = { type: 'paragraph', content: [] }
    } else if (line.startsWith('- ')) {
      if (currentSection.type !== 'list') {
        if (currentSection.content.length > 0) {
          sections.push(currentSection)
        }
        currentSection = { type: 'list', content: [] }
      }
      currentSection.content.push(line.replace('- ', ''))
    } else if (line.trim()) {
      if (currentSection.type === 'list') {
        sections.push(currentSection)
        currentSection = { type: 'paragraph', content: [] }
      }
      currentSection.content.push(line)
    } else if (currentSection.content.length > 0) {
      sections.push(currentSection)
      currentSection = { type: 'paragraph', content: [] }
    }
  }

  if (currentSection.content.length > 0) {
    sections.push(currentSection)
  }

  return sections
}

export function getWordCount(content) {
  if (!content) return 0
  return content.split(/\s+/).filter(word => word.length > 0).length
}

export function getReadingTime(content) {
  const words = getWordCount(content)
  const minutes = Math.ceil(words / 200)
  return minutes
}

export function extractFirstParagraph(content, maxLength = 200) {
  if (!content) return ''
  const firstPara = content.split('\n\n')[0] || ''
  if (firstPara.length <= maxLength) return firstPara
  return firstPara.slice(0, maxLength).trim() + '...'
}
