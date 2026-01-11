import { ethers } from 'ethers'

let provider

// Initialize provider
const initProvider = () => {
  if (!provider) {
    const rpcUrl = process.env.ETH_RPC_URL
    if (!rpcUrl) {
      console.warn('ETH_RPC_URL not configured. ENS resolution will not work.')
      return null
    }
    provider = new ethers.JsonRpcProvider(rpcUrl)
  }
  return provider
}

export const resolveENS = async (address) => {
  try {
    const provider = initProvider()
    if (!provider) {
      return null
    }

    const ensName = await provider.lookupAddress(address)
    return ensName || null
  } catch (error) {
    console.error('ENS resolution failed for', address, ':', error.message)
    return null
  }
}

export const resolveENSBatch = async (addresses) => {
  const provider = initProvider()
  if (!provider) {
    return addresses.map(() => null)
  }

  const results = await Promise.allSettled(
    addresses.map(addr => provider.lookupAddress(addr))
  )

  return results.map(result =>
    result.status === 'fulfilled' ? result.value : null
  )
}
