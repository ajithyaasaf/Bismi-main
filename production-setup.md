# Production Deployment Setup

## Overview
This document outlines the deployment strategy for Bismi Chicken Shop application:
- **Frontend**: Vercel (React/Vite application)
- **Backend**: Render (Express.js API server)
- **Database**: Firebase Firestore

## Frontend Deployment (Vercel)

### 1. Prepare Frontend Build
The frontend is located in the `client/` directory and includes:
- React application with Vite build system
- Shadcn UI components
- TailwindCSS styling
- React Query for API state management

### 2. Environment Variables for Vercel
Add these environment variables in Vercel dashboard:
```
VITE_API_URL=https://your-backend-url.onrender.com
NODE_ENV=production
```

### 3. Build Configuration
Vercel will automatically detect the Vite configuration and build the frontend.

## Backend Deployment (Render)

### 1. Prepare Backend Build
The backend includes:
- Express.js server
- Firebase Admin SDK integration
- RESTful API endpoints
- CORS configuration for frontend access

### 2. Environment Variables for Render
Add these environment variables in Render dashboard:
```
NODE_ENV=production
PORT=10000
FIREBASE_SERVICE_ACCOUNT_KEY=<your-firebase-service-account-json>
FIREBASE_PROJECT_ID=<your-project-id>
FIREBASE_CLIENT_EMAIL=<your-client-email>
FIREBASE_PRIVATE_KEY=<your-private-key>
```

### 3. Build and Start Commands
- Build: `npm install && npm run build`
- Start: `npm start`

## Security and Performance

### CORS Configuration
The backend is configured to accept requests from your Vercel frontend domain.

### Firebase Security
- Uses Firebase Admin SDK for server-side operations
- Secure authentication with service account credentials
- Environment-based configuration for different deployment stages

### Performance Optimizations
- Frontend: Static asset optimization with Vite
- Backend: Express.js with production optimizations
- Database: Firestore with optimized queries

## Deployment Steps

1. **Prepare Firebase Credentials**
2. **Deploy Backend to Render**
3. **Configure Frontend API URL**
4. **Deploy Frontend to Vercel**
5. **Test End-to-End Functionality**