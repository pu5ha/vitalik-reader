# Vitalik Reader

A Web3-enabled reading companion for Vitalik Buterin's blog posts with cryptographic signatures, ENS integration, and AI-powered discussions.

## Features

🔷 **Web3 Social Features**
- Connect Ethereum wallet (MetaMask, WalletConnect)
- Cryptographically sign that you've read blog posts
- View all readers who signed each essay
- Generate and share premium certificate badges

📚 **Enhanced Reading Experience**
- 154 essays organized into 6 categories (Protocol, Math, Governance, Society, Applications, General)
- Text-to-speech functionality
- AI-powered chat discussions (bring your own Claude API key)
- Clean, distraction-free reading mode

🎨 **Design**
- Warm editorial aesthetic inspired by literary magazines
- Responsive design for mobile and desktop
- Category-specific color coding

## Tech Stack

**Frontend:**
- React 18.2 + Vite
- wagmi + viem (Web3 connectivity)
- @tanstack/react-query
- Web Speech API (text-to-speech)

**Backend:**
- Node.js + Express
- MongoDB (signature storage)
- ethers.js (signature verification, ENS resolution)
- node-canvas (badge generation)

## Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier)
- Alchemy API key (free tier)
- WalletConnect Project ID (free)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pu5ha/vitalik-reader.git
   cd vitalik-reader
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Set up environment variables**

   **Frontend (.env):**
   ```bash
   cp .env.example .env
   # Edit .env and add your values
   ```

   **Backend (backend/.env):**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env and add your values
   ```

5. **Get required API keys**

   - **MongoDB:** Create free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - **Alchemy:** Get API key at [alchemy.com](https://www.alchemy.com/) for ENS resolution
   - **WalletConnect:** Get Project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com/)

### Running Locally

1. **Start the backend** (Terminal 1):
   ```bash
   cd backend
   node server.js
   ```

2. **Start the frontend** (Terminal 2):
   ```bash
   npm run dev
   ```

3. **Open browser**: http://localhost:5173

## Project Structure

```
vitalik-reader/
├── src/                      # Frontend React app
│   ├── components/           # React components
│   │   ├── BlogList.jsx      # Home page with filtering
│   │   ├── BlogView.jsx      # Blog detail with summary
│   │   ├── ReadMode.jsx      # Full-text reading mode
│   │   ├── WalletConnect.jsx # Wallet connection UI
│   │   ├── SignBlogButton.jsx# Sign blog feature
│   │   ├── ReadersPanel.jsx  # Show all readers
│   │   ├── TextToSpeech.jsx  # TTS controls
│   │   └── ChatWindow.jsx    # AI chat sidebar
│   ├── config/
│   │   └── wagmi.js          # Web3 configuration
│   └── utils/
│       ├── anthropic.js      # Claude API integration
│       └── blog-parser.js    # Content parsing
├── backend/                  # Express API server
│   ├── models/               # MongoDB schemas
│   ├── routes/               # API endpoints
│   ├── middleware/           # Signature verification
│   └── utils/                # ENS resolver, badge generator
├── public/
│   └── blogs.json            # Blog content (3.3MB)
└── scripts/
    └── fetch-blogs.js        # Crawl and update blogs
```

## API Endpoints

### POST /api/signatures/sign
Record a user's signature for reading a blog post.

**Request:**
```json
{
  "blogId": "general-2025-12-30-balance_of_power",
  "userAddress": "0x1234...5678",
  "signature": "0xabc...",
  "message": "I have read: Balance of power..."
}
```

### GET /api/signatures/:blogId
Get all users who signed a specific blog.

**Response:**
```json
{
  "blogId": "general-2025-12-30-balance_of_power",
  "count": 42,
  "signatures": [
    {
      "userAddress": "0x1234...5678",
      "ensName": "vitalik.eth",
      "signedAt": "2026-01-11T10:30:00Z"
    }
  ]
}
```

### GET /api/badges/:blogId/:address
Generate and return a certificate badge image (PNG).

## Security

- Signatures verified server-side with ethers.js
- Timestamp validation prevents replay attacks (5-minute window)
- Rate limiting: 10 signatures per IP per 15 minutes
- Input validation with express-validator
- CORS restricted to frontend origin
- User-provided Claude API keys (no shared credentials)

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Deployment

### Frontend (Vercel/Netlify)
- Set environment variables in dashboard
- Update `VITE_API_URL` to production backend URL

### Backend (Railway/Render)
- Deploy from `backend` directory
- Add environment variables
- Update MongoDB to production cluster
- Update CORS_ORIGIN to production frontend URL

## License

MIT

## Acknowledgments

- Essays by [Vitalik Buterin](https://vitalik.eth.limo)
- Web3 connectivity via [wagmi](https://wagmi.sh/)
- AI discussions powered by [Claude](https://www.anthropic.com/claude)

---

Built with ❤️ for the Ethereum community
