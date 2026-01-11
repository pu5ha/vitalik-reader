import { useState, useEffect, useRef } from 'react'

function TextToSpeech({ text, title }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const utteranceRef = useRef(null)

  useEffect(() => {
    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
      setIsSupported(false)
    }

    // Cleanup on unmount
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const cleanText = (content) => {
    // Remove markdown formatting and clean up text for speech
    return content
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '') // Remove italic
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links but keep text
      .replace(/`/g, '') // Remove code backticks
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim()
  }

  const handlePlay = () => {
    if (!isSupported) {
      alert('Text-to-speech is not supported in your browser')
      return
    }

    if (isPaused) {
      // Resume if paused
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    // Create new utterance
    const cleanedText = cleanText(text)
    const utterance = new SpeechSynthesisUtterance(cleanedText)
    utteranceRef.current = utterance

    // Configure voice settings
    utterance.rate = 1.0 // Normal speed
    utterance.pitch = 1.0 // Normal pitch
    utterance.volume = 1.0 // Full volume

    // Event handlers
    utterance.onstart = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      setIsPlaying(false)
      setIsPaused(false)
    }

    // Start speaking
    window.speechSynthesis.speak(utterance)
  }

  const handlePause = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setIsPaused(true)
      setIsPlaying(false)
    }
  }

  const handleStop = () => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
  }

  if (!isSupported) {
    return null // Don't render if not supported
  }

  return (
    <div className="text-to-speech-controls">
      {!isPlaying && !isPaused && (
        <button
          onClick={handlePlay}
          className="tts-btn tts-play"
          title="Listen to this essay"
        >
          🔊 Listen
        </button>
      )}

      {isPlaying && (
        <button
          onClick={handlePause}
          className="tts-btn tts-pause"
          title="Pause"
        >
          ⏸ Pause
        </button>
      )}

      {isPaused && (
        <button
          onClick={handlePlay}
          className="tts-btn tts-resume"
          title="Resume"
        >
          ▶ Resume
        </button>
      )}

      {(isPlaying || isPaused) && (
        <button
          onClick={handleStop}
          className="tts-btn tts-stop"
          title="Stop"
        >
          ⏹ Stop
        </button>
      )}
    </div>
  )
}

export default TextToSpeech
