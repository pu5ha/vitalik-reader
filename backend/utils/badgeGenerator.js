import { createCanvas } from 'canvas'

const formatAddress = (addr) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

const formatSignature = (sig) => {
  if (!sig) return ''
  return `${sig.slice(0, 10)}...${sig.slice(-8)}`
}

// Helper function to wrap text to multiple lines
const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
  const words = text.split(' ')
  let line = ''
  const lines = []

  for (let word of words) {
    const testLine = line + word + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line !== '') {
      lines.push(line)
      line = word + ' '
    } else {
      line = testLine
    }
  }
  lines.push(line)

  lines.forEach((line, i) => {
    ctx.fillText(line.trim(), x, y + i * lineHeight)
  })

  return lines.length
}

export const generateBadge = async (userData, blogData) => {
  console.log('Badge generation - userData:', {
    address: userData.address,
    ensName: userData.ensName,
    hasSignature: !!userData.signature,
    signatureLength: userData.signature?.length
  })

  // Canvas dimensions (Instagram-friendly 1080x1080)
  const width = 1080
  const height = 1080
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // Background gradient: deep burgundy to warm cream
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#8B3A3A')    // Deep burgundy
  gradient.addColorStop(0.4, '#A85454')  // Mid burgundy
  gradient.addColorStop(1, '#FAF8F5')    // Warm cream
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // Decorative corner elements (top-left and bottom-right)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.lineWidth = 3

  // Top-left corner
  ctx.beginPath()
  ctx.moveTo(60, 200)
  ctx.lineTo(60, 60)
  ctx.lineTo(200, 60)
  ctx.stroke()

  // Bottom-right corner
  ctx.beginPath()
  ctx.moveTo(width - 60, height - 200)
  ctx.lineTo(width - 60, height - 60)
  ctx.lineTo(width - 200, height - 60)
  ctx.stroke()

  // Central white content box with shadow
  const boxPadding = 100
  const boxY = 250
  const boxHeight = 650

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.fillRect(boxPadding + 10, boxY + 10, width - boxPadding * 2, boxHeight)

  // White box
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(boxPadding, boxY, width - boxPadding * 2, boxHeight)

  // Decorative top border on white box
  ctx.fillStyle = '#8B3A3A'
  ctx.fillRect(boxPadding, boxY, width - boxPadding * 2, 8)

  // Header: "VITALIK READER" in white on burgundy background
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 64px "DejaVu Sans", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('VITALIK READER', width / 2, 160)

  // Subheader
  ctx.font = '26px "DejaVu Sans", Arial, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.fillText('CERTIFIED READER', width / 2, 205)

  // Inside the white box
  const contentY = boxY + 80

  // "This certifies that" label
  ctx.font = 'italic 22px "DejaVu Serif", Georgia, serif'
  ctx.fillStyle = '#8A8A8A'
  ctx.fillText('This certifies that', width / 2, contentY)

  // ENS name or address (primary) - large and prominent
  ctx.font = 'bold 72px "DejaVu Serif", Georgia, serif'
  ctx.fillStyle = '#8B3A3A'
  const displayName = userData.ensName || formatAddress(userData.address)
  ctx.fillText(displayName, width / 2, contentY + 80)

  // Show signature below name in smaller text
  let addressOffset = 0
  if (userData.signature) {
    ctx.font = 'italic 18px "DejaVu Sans", Arial, sans-serif'
    ctx.fillStyle = '#8A8A8A'
    ctx.fillText('Signature:', width / 2, contentY + 115)

    ctx.font = '24px "DejaVu Sans Mono", Courier, monospace'
    ctx.fillStyle = '#B5B5B5'
    ctx.fillText(formatSignature(userData.signature), width / 2, contentY + 145)
    addressOffset = 65
  }

  // "has read" label
  ctx.font = 'italic 22px "DejaVu Serif", Georgia, serif'
  ctx.fillStyle = '#8A8A8A'
  ctx.fillText('has read', width / 2, contentY + 170 + addressOffset)

  // Blog title in a decorative style
  ctx.font = 'bold 42px "DejaVu Serif", Georgia, serif'
  ctx.fillStyle = '#1A1A1A'
  const titleY = contentY + 240 + addressOffset
  const numLines = wrapText(ctx, `"${blogData.title}"`, width / 2, titleY, 700, 55)

  // Decorative underline
  const underlineY = titleY + (numLines - 1) * 55 + 25
  ctx.strokeStyle = '#8B3A3A'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(width / 2 - 250, underlineY)
  ctx.lineTo(width / 2 + 250, underlineY)
  ctx.stroke()

  // Date in elegant format
  const dateY = underlineY + 60
  ctx.font = '26px "DejaVu Serif", Georgia, serif'
  ctx.fillStyle = '#4A4A4A'
  const dateStr = new Date(userData.signedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  ctx.fillText(dateStr, width / 2, dateY)

  // Decorative seal/badge icon (circular)
  const sealX = width / 2
  const sealY = dateY + 80
  const sealRadius = 45

  // Outer circle
  ctx.beginPath()
  ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2)
  ctx.fillStyle = '#8B3A3A'
  ctx.fill()

  // Inner circle
  ctx.beginPath()
  ctx.arc(sealX, sealY, sealRadius - 8, 0, Math.PI * 2)
  ctx.strokeStyle = '#FAF8F5'
  ctx.lineWidth = 2
  ctx.stroke()

  // Checkmark in seal
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(sealX - 15, sealY)
  ctx.lineTo(sealX - 5, sealY + 12)
  ctx.lineTo(sealX + 15, sealY - 12)
  ctx.stroke()

  // Footer
  ctx.font = 'italic 20px "DejaVu Sans", Arial, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('vitalik.eth', width / 2, height - 50)

  return canvas.toBuffer('image/png')
}
