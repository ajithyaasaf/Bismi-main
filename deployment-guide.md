# Bismi Chicken Shop Deployment Guide

## Current Deployment Setup

### Frontend (Vercel)
- **URL**: https://bismi-main.vercel.app/
- **Platform**: Vercel
- **Build Command**: `npm run build:client` (or `vite build`)
- **Output Directory**: `dist/public`

### Backend (Render)
- **URL**: https://bismi-main.onrender.com/
- **Platform**: Render
- **Build Command**: `npm run build:server` (or `esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`)
- **Start Command**: `npm start` (or `node dist/production.js`)

## Environment Variables Required

### Backend (Render)
```
NODE_ENV=production
PORT=10000
FIREBASE_SERVICE_ACCOUNT_KEY=[Your Firebase Service Account JSON]
```

### Frontend (Vercel)
No environment variables needed - API endpoints are automatically configured to point to your Render backend.

## Files Overview

### Production-Ready Files
- `server/production.ts` - Optimized backend server for Render
- `client/src/lib/config.ts` - API configuration for frontend/backend separation
- `vercel.json` - Frontend deployment configuration
- `render.yaml` - Backend deployment configuration

### Development Files
- `server/index.ts` - Development server with Vite integration
- `server/routes.ts` - Main route definitions (used by both dev and prod)

## Deployment Process

### Vercel (Frontend)
1. Connect your GitHub repository to Vercel
2. Set build command: `vite build`
3. Set output directory: `dist/public`
4. Deploy automatically on push to main branch

### Render (Backend)
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
4. Set start command: `node dist/production.js`
5. Add environment variables (especially FIREBASE_SERVICE_ACCOUNT_KEY)
6. Deploy automatically on push to main branch

## API Configuration
The frontend automatically detects the environment:
- **Development**: Uses `/api` (local server)
- **Production**: Uses `https://bismi-main.onrender.com/api` (Render backend)

## Health Check
Backend health endpoint: `https://bismi-main.onrender.com/api/health`