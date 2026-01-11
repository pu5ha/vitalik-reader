import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

function SignBlogButton({ blog, onSigned }) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [loading, setLoading] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check if user has already signed this blog
  useEffect(() => {
    const checkIfSigned = async () => {
      if (!isConnected || !address) {
        setChecking(false)
        return
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/signatures/${blog.id}`
        )
        const data = await response.json()

        // Check if current user's address is in the signatures
        const userSigned = data.signatures?.some(
          sig => sig.userAddress.toLowerCase() === address.toLowerCase()
        )

        setHasSigned(userSigned)
      } catch (error) {
        console.error('Error checking signature status:', error)
      } finally {
        setChecking(false)
      }
    }

    checkIfSigned()
  }, [blog.id, address, isConnected])

  const handleSign = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }

    setLoading(true)
    try {
      const timestamp = Date.now()
      const message = `I have read: ${blog.title}\nBlog ID: ${blog.id}\nTimestamp: ${timestamp}`

      // Sign message with wallet
      const signature = await signMessageAsync({ message })

      // Send to backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/signatures/sign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blogId: blog.id,
            userAddress: address,
            signature,
            message,
          }),
        }
      )

      if (response.ok) {
        setHasSigned(true)
        onSigned?.() // Callback to refresh readers list
      } else {
        const data = await response.json()
        alert(`Failed to sign: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Signing failed:', error)
      if (error.message.includes('User rejected')) {
        alert('Signature request was rejected')
      } else {
        alert('Failed to sign. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <button className="sign-blog-btn" disabled>
        Checking...
      </button>
    )
  }

  if (hasSigned) {
    return (
      <button className="sign-blog-btn signed" disabled>
        ✓ Signed
      </button>
    )
  }

  return (
    <button
      onClick={handleSign}
      className="sign-blog-btn"
      disabled={loading || !isConnected}
    >
      {loading ? 'Signing...' : 'Sign as Read'}
    </button>
  )
}

export default SignBlogButton
