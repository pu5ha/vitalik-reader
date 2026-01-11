function Loading({ message = 'Loading...' }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="eth-logo">
          <svg viewBox="0 0 256 417" className="eth-icon">
            <path fill="#8B3A3A" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" opacity="0.6"/>
            <path fill="#4A4A4A" d="M127.962 0L0 212.32l127.962 75.639V154.158z" opacity="0.4"/>
            <path fill="#8B3A3A" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" opacity="0.6"/>
            <path fill="#4A4A4A" d="M127.962 416.905V312.187L0 236.587z" opacity="0.4"/>
            <path fill="#1A1A1A" d="M127.961 287.958l127.96-75.637-127.96-58.162z" opacity="0.2"/>
            <path fill="#8B3A3A" d="M0 212.32l127.96 75.638V154.159z" opacity="0.5"/>
          </svg>
        </div>
      </div>
      <p className="loading-message">{message}</p>
    </div>
  )
}

export default Loading
