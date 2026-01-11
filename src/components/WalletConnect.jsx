import { useAccount, useConnect, useDisconnect, useEnsName } from 'wagmi'

function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({ address })

  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <span className="wallet-address">
          {ensName || formatAddress(address)}
        </span>
        <button onClick={disconnect} className="wallet-disconnect-btn">
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className="wallet-connect-btn"
    >
      Connect Wallet
    </button>
  )
}

export default WalletConnect
