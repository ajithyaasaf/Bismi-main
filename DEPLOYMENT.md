# Deployment Guide

This project uses a split deployment architecture:
- **Backend**: Already deployed on Render at https://bismi-main.onrender.com
- **Frontend**: Can be deployed to various static hosting platforms

## Deployment Options

### Option 1: Vercel
1. Connect your GitHub repository to Vercel
2. Use the existing `vercel.json` configuration
3. The frontend will automatically connect to your Render backend

### Option 2: Netlify
1. Connect your GitHub repository to Netlify
2. Use the existing `netlify.toml` configuration
3. Build command: `vite build`
4. Publish directory: `dist/public`

### Option 3: Render Static Site
1. Create a new Static Site service on Render
2. Use the existing `render.yaml` configuration
3. Connect to your GitHub repository

### Option 4: GitHub Pages
1. Enable GitHub Pages in your repository settings
2. Use GitHub Actions to build and deploy
3. Add the `_redirects` file for SPA routing

## Environment Variables

For production deployments, set:
```
VITE_API_BASE_URL=https://bismi-main.onrender.com
```

## Build Configuration

The project is configured to:
- Build frontend to `dist/public` directory
- Connect to existing Render backend API
- Handle SPA routing with fallback to `index.html`

## Backend Configuration

Your backend is already working on Render and handles:
- API endpoints at `/api/*`
- Firebase/Firestore data storage
- CORS configuration for frontend domains