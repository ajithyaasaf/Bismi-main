# Vercel Deployment Instructions

## Quick Fix for Your Current Issue

The MIME type error occurs because Vercel is serving your app incorrectly. Here's the simple solution:

### 1. Environment Variables in Vercel Dashboard
Add this environment variable in your Vercel project settings:
- `VITE_API_BASE_URL` = `https://bismi-main.onrender.com`

### 2. Deploy Steps
1. Connect your GitHub repo to Vercel
2. Set build command: `vite build`
3. Set output directory: `dist/public`
4. Add the environment variable above
5. Deploy

### 3. If Still Getting Errors
- Make sure your repo root contains the `vercel.json` file
- Ensure all dependencies are in `package.json` (which they are)
- The build should only create frontend files, not backend

## Why This Fixes Your Issue
- Your backend is already working on Render
- Vercel only needs to serve your React frontend
- The frontend will connect to your Render backend via API calls
- Environment variable ensures production API calls go to correct backend

## Alternative: Simple Netlify Deploy
If Vercel continues having issues:
1. Run `npm run build` locally
2. Upload the `dist/public` folder to Netlify
3. Set environment variable `VITE_API_BASE_URL=https://bismi-main.onrender.com`