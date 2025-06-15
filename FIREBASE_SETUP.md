# Firebase Setup for Bismi Chicken Shop

This document outlines how to set up and use Firebase with the Bismi Chicken Shop application.

## Firebase Configuration

The application is configured to use Firebase in the following ways:

1. **Client-side Firebase (Web SDK)**: Used in the browser for real-time updates.
2. **Server-side Firebase (Admin SDK)**: Used on the server for secure data operations.

## Environment Variables

### Development Environment (.env file)

```
# Client-side Firebase configuration (used by the web application)
VITE_FIREBASE_API_KEY=AIzaSyA3f4gJOKZDIjy9gnhSSpMVLs1UblGxo0s
VITE_FIREBASE_AUTH_DOMAIN=bismi-broilers-3ca96.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://bismi-broilers-3ca96-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=bismi-broilers-3ca96
VITE_FIREBASE_STORAGE_BUCKET=bismi-broilers-3ca96.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=949430744092
VITE_FIREBASE_APP_ID=1:949430744092:web:4ea5638a9d38ba3e76dbd9

# Server-side Firebase configuration
FIREBASE_PROJECT_ID=bismi-broilers-3ca96

# Enable Firestore (set to false in development for in-memory storage)
USE_FIRESTORE=false
```

### Production Environment (Vercel)

When deploying to Vercel, add the following environment variables in the Vercel dashboard:

- `USE_FIRESTORE`: Set to `true` to enable Firestore in production
- `FIREBASE_PROJECT_ID`: Set to your Firebase project ID (e.g., `bismi-broilers-3ca96`)

## Storage Options

The application supports two storage options:

1. **In-memory Storage**: Used in development by default. Data is stored in memory and is lost when the server restarts.
2. **Firestore Storage**: Used in production. Data is stored in Firestore and persists across server restarts.

## Enabling Firestore in Development

To test with Firestore in development:

1. Set `USE_FIRESTORE=true` in your `.env` file
2. Restart the server

## Deploying with Firestore to Vercel

The Vercel deployment is configured to use Firestore by default (see `vercel.json`). The Firebase Admin SDK is initialized using Application Default Credentials (ADC), which works seamlessly with Vercel's environment.

No additional service account credentials are needed when deploying to Vercel.

## Data Structure

The application uses the following Firestore collections:

- `suppliers`: For supplier data
- `inventory`: For inventory items
- `customers`: For customer data
- `orders`: For order data
- `transactions`: For transaction data
- `users`: For user data

Each collection uses the schema defined in `shared/schema.ts`.

## Fallback Mechanism

If Firestore is not available (e.g., due to connectivity issues), the application will log warnings and gracefully fall back to returning empty arrays or default values. This ensures the application remains functional even if Firestore is temporarily unavailable.