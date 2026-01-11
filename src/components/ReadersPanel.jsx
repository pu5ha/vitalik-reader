function ReadersPanel({ readers, loading, blogId }) {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatSignature = (sig) => {
    if (!sig) return ''
    return `${sig.slice(0, 10)}...${sig.slice(-8)}`
  }

  const downloadBadge = async (reader) => {
    try {
      const url = `${import.meta.env.VITE_API_URL}/api/signatures/badges/${blogId}/${reader.userAddress}`
      const link = document.createElement('a')
      link.href = url
      link.download = `vitalik-reader-badge-${blogId}.png`
      link.target = '_blank'
      link.click()
    } catch (error) {
      console.error('Badge download failed:', error)
      alert('Failed to download badge. Please try again.')
    }
  }

  if (loading) {
    return <div className="readers-panel loading">Loading readers...</div>
  }

  if (readers.length === 0) {
    return (
      <div className="readers-panel empty">
        <p>No readers have signed this essay yet.</p>
        <p className="hint">Be the first to sign it!</p>
      </div>
    )
  }

  return (
    <div className="readers-panel">
      <div className="readers-count">
        {readers.length} reader{readers.length !== 1 ? 's' : ''} signed this essay
      </div>

      <div className="readers-list">
        {readers.map((reader, index) => (
          <div key={index} className="reader-card">
            <div className="reader-info">
              <div className="reader-name">
                {reader.ensName || formatAddress(reader.userAddress)}
              </div>
              <div className="reader-signature">
                {formatSignature(reader.signature)}
              </div>
              <div className="reader-date">{formatDate(reader.signedAt)}</div>
            </div>
            <button
              className="download-badge-btn"
              onClick={() => downloadBadge(reader)}
              title="Download badge"
            >
              Download Badge
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReadersPanel
