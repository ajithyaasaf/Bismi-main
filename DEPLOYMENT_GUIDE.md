# Bismi Chicken Shop - Deployment Guide

## Overview
Deploy your application with frontend on Vercel and backend on Render for scalable, production-ready hosting.

## Prerequisites
- Firebase project with Firestore database
- GitHub repository with your code
- Vercel account
- Render account

## Part 1: Backend Deployment (Render)

### 1. Prepare Firebase Credentials
Get your Firebase service account key:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Download the JSON file
4. Copy the entire JSON content for environment variables

### 2. Deploy to Render
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Configure build settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

### 3. Set Environment Variables in Render
Add these environment variables in your Render dashboard:
```
NODE_ENV=production
PORT=10000
FIREBASE_SERVICE_ACCOUNT_KEY=<paste-your-complete-firebase-json-here>
```

Alternative method (individual variables):
```
NODE_ENV=production
PORT=10000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key
```

### 4. Update CORS Origins
In `server/production-index.ts`, replace the placeholder with your actual Vercel domain:
```typescript
const allowedOrigins = [
  'https://your-actual-frontend-domain.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000'
];
```

## Part 2: Frontend Deployment (Vercel)

### 1. Update API Configuration
In `vercel.json`, replace the placeholder with your actual Render backend URL:
```json
{
  "env": {
    "VITE_API_URL": "https://your-actual-backend-url.onrender.com"
  }
}
```

### 2. Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the Vite configuration
3. Set environment variables in Vercel dashboard:
   ```
   VITE_API_URL=https://your-actual-backend-url.onrender.com
   NODE_ENV=production
   ```

### 3. Build Configuration
Vercel will use the existing `vite.config.ts` and build settings automatically.

## Part 3: Production Optimization

### Security
- Firebase Admin SDK provides secure server-side operations
- CORS configured for specific domains only
- Environment variables secure sensitive data

### Performance
- Static assets served via Vercel's global CDN
- Backend optimized for Express.js production
- Firestore configured for optimal queries

### Monitoring
- Backend includes health check endpoint: `/health`
- Request logging for debugging
- Error handling with proper status codes

## Testing Deployment

### 1. Backend Health Check
Visit: `https://your-backend-url.onrender.com/health`
Should return: `{"status":"ok","timestamp":"...","environment":"production"}`

### 2. Frontend Functionality
- Test all pages load correctly
- Verify API calls work (check browser network tab)
- Test CRUD operations for all entities

### 3. Cross-Origin Requests
Ensure the frontend can successfully communicate with the backend API.

## Troubleshooting

### Common Issues
1. **CORS Errors**: Update allowed origins in `server/production-index.ts`
2. **Firebase Connection**: Verify service account credentials
3. **API Not Found**: Check `VITE_API_URL` environment variable
4. **Build Failures**: Ensure all dependencies are in `package.json`

### Logs
- **Render**: Check deployment logs in Render dashboard
- **Vercel**: Check function logs in Vercel dashboard
- **Frontend**: Use browser developer tools

## File Changes Made

### Production-Ready Backend
- Created `server/production-index.ts` with CORS and error handling
- Updated `client/src/lib/queryClient.ts` for environment-based API URLs

### Deployment Configurations
- Updated `vercel.json` for frontend deployment
- Created `.env.example` with required environment variables

### Documentation
- Consolidated deployment instructions
- Removed duplicate configuration files

## Next Steps
1. Get your Firebase credentials
2. Deploy backend to Render with environment variables
3. Update CORS origins with your actual Vercel domain
4. Deploy frontend to Vercel with backend URL
5. Test complete functionality