# Deployment Guide - Vitalik Reader

This guide covers deploying the Vitalik Reader application to Vercel.

## Architecture

- **Frontend**: React + Vite (static site)
- **Backend**: Node.js + Express (serverless functions)
- **Database**: MongoDB Atlas
- **Wallet Integration**: WalletConnect v3

## Deployment Steps

### 1. Install Vercel CLI (if not already installed)

```bash
npm install -g vercel
```

### 2. Deploy Backend API

```bash
cd backend
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? `vitalik-reader-api` (or your preferred name)
- In which directory is your code located? **./
**
- Want to override the settings? **N**

#### Backend Environment Variables

After deployment, add these environment variables in the Vercel dashboard:

**Required:**
- `MONGODB_URI` - Your MongoDB connection string
- `CORS_ORIGIN` - Your frontend URL (e.g., `https://vitalik-reader.vercel.app`)
- `ALCHEMY_RPC_URL` - Alchemy RPC endpoint for ENS resolution

**Optional:**
- `NODE_ENV` - Set to `production`
- `PORT` - Not needed for Vercel (auto-configured)

**To add environment variables:**
1. Go to your project in Vercel dashboard
2. Settings → Environment Variables
3. Add each variable
4. Redeploy: `vercel --prod`

### 3. Deploy Frontend

```bash
cd ..  # Back to root directory
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? `vitalik-reader`
- In which directory is your code located? **./**
- Want to override the settings? **N**

#### Frontend Environment Variables

Add these in the Vercel dashboard:

**Required:**
- `VITE_API_URL` - Your backend API URL (e.g., `https://vitalik-reader-api.vercel.app`)
- `VITE_WALLETCONNECT_PROJECT_ID` - Your WalletConnect project ID from https://cloud.walletconnect.com

**To add environment variables:**
1. Go to your project in Vercel dashboard
2. Settings → Environment Variables
3. Add each variable with prefix `VITE_`
4. Redeploy: `vercel --prod`

### 4. Update CORS Configuration

After deploying the frontend, update the backend's `CORS_ORIGIN` environment variable:
1. Go to backend project in Vercel dashboard
2. Settings → Environment Variables
3. Update `CORS_ORIGIN` to your frontend production URL
4. Redeploy backend: `cd backend && vercel --prod`

### 5. Production Deployment

Once you've tested the preview deployments:

```bash
# Deploy backend to production
cd backend
vercel --prod

# Deploy frontend to production
cd ..
vercel --prod
```

## Environment Variables Summary

### Backend (`/backend`)
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
CORS_ORIGIN=https://your-frontend-url.vercel.app
ALCHEMY_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key
NODE_ENV=production
```

### Frontend (`/`)
```
VITE_API_URL=https://your-backend-url.vercel.app
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

## Custom Domains (Optional)

### Add Custom Domain to Frontend
1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `vitalik-reader.com`)
3. Configure DNS with your domain provider

### Add Custom Domain to Backend
1. Vercel Dashboard → Backend Project → Settings → Domains
2. Add subdomain (e.g., `api.vitalik-reader.com`)
3. Update frontend's `VITE_API_URL` to use new domain
4. Update backend's `CORS_ORIGIN` to allow new frontend domain

## Post-Deployment Checklist

- [ ] Backend API accessible at `/health` endpoint
- [ ] Frontend loads correctly
- [ ] Wallet connection works (test with MetaMask/WalletConnect)
- [ ] Blog signing works
- [ ] Comments system works (post, vote, reply, edit, delete)
- [ ] ENS names resolve correctly
- [ ] Badges generate correctly
- [ ] Rate limiting works (test multiple rapid requests)
- [ ] MongoDB connection stable

## Troubleshooting

### Backend Issues

**"Cannot connect to MongoDB"**
- Check `MONGODB_URI` is correctly set in Vercel environment variables
- Ensure MongoDB Atlas allows connections from anywhere (0.0.0.0/0) for serverless
- Check MongoDB Atlas cluster is running

**"CORS error in browser"**
- Verify `CORS_ORIGIN` matches your frontend URL exactly
- Redeploy backend after changing environment variables

**"Rate limit errors"**
- Vercel serverless functions are stateless, rate limiting uses in-memory storage
- Consider using Redis for persistent rate limiting in production

### Frontend Issues

**"API requests failing"**
- Check `VITE_API_URL` is correctly set and accessible
- Verify environment variables are prefixed with `VITE_`
- Rebuild frontend after changing environment variables

**"Wallet connection not working"**
- Verify `VITE_WALLETCONNECT_PROJECT_ID` is set correctly
- Check WalletConnect project is active in dashboard

### General Issues

**"Changes not appearing after deployment"**
- Clear browser cache
- Check correct Git branch is deployed
- Verify environment variables are set in **Production** environment

**"Serverless function timeout"**
- Vercel has 10s timeout for Hobby plan, 60s for Pro
- Optimize database queries
- Add indexes to MongoDB collections (already configured in models)

## Monitoring

- **Vercel Analytics**: Automatically enabled
- **Error Logs**: Vercel Dashboard → Your Project → Logs
- **MongoDB Monitoring**: MongoDB Atlas → Monitoring tab

## Scaling Considerations

- **Vercel Hobby Plan**: 100GB bandwidth, unlimited requests
- **MongoDB Atlas Free Tier**: 512MB storage, shared cluster
- **Rate Limiting**: Current in-memory storage will reset on each cold start
  - Consider Redis for production (Upstash, Redis Cloud)
- **Database Indexes**: Already configured for optimal query performance

## Security Notes

- Never commit `.env` files to Git
- Rotate API keys periodically
- Monitor for suspicious activity in MongoDB Atlas
- Review Vercel deployment logs regularly
- Keep dependencies updated (`npm audit`)

## Support

- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- WalletConnect Docs: https://docs.walletconnect.com/
