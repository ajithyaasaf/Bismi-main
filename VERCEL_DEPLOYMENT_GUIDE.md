# Vercel Deployment Fix for Firebase

## Problem
Firebase not working on Vercel despite correct environment variables. The issue is typically with private key formatting in Vercel's environment variable system.

## Solution Steps

### 1. Update Environment Variables in Vercel

In your Vercel dashboard, set these environment variables exactly as shown:

**Client-side variables (VITE_ prefix):**
```
VITE_FIREBASE_API_KEY=AIzaSyA3f4gJOKZDIjy9gnhSSpMVLs1UblGxo0s
VITE_FIREBASE_AUTH_DOMAIN=bismi-broilers-3ca96.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://bismi-broilers-3ca96-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=bismi-broilers-3ca96
VITE_FIREBASE_STORAGE_BUCKET=bismi-broilers-3ca96.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=949430744092
VITE_FIREBASE_APP_ID=1:949430744092:web:4ea5638a9d38ba3e76dbd9
```

**Server-side variables:**
```
USE_FIRESTORE=true
FIREBASE_PROJECT_ID=bismi-broilers-3ca96
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-uj6n4@bismi-broilers-3ca96.iam.gserviceaccount.com
```

**For FIREBASE_PRIVATE_KEY:** 
Copy the ENTIRE private key including the BEGIN and END markers, but make sure it's on a SINGLE LINE with `\n` for line breaks:

```
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCplrPwoPf12SJ0\nl9FI7wBF/8e7MKsaBbUVz1TMJx1SsbJbGgzLyL78YyOYhrAYx2RxBJcnYfQrsqv0\nIVGAAJeNqpR0tKwJOimbvEN+ly01pFet4CAZLxwFGfVGz2LY0IWCT0Ez1xftlO5z\n7S7h9eb0JLVqMK/t1gBzMziHRKBuwwLuiFPjNx+wdsqYaEGyB9bL0uYAju28m1hP\nzRgDg5jWghUugkGaO2m17Tk4HNuT0nP2WM0/Ig4OQQpez+5X3HF93tKPM0gm39lz\nVwyXajiGqBDpx2vES5wOfC1Cd43b0su7SB7deRqFZVKwkEfqZFYDGpqL8NHbxHx+\nIrwjvnurAgMBAAECggEAEdzc0TCzTYL0fSFsmukHhf2y7YMaFQTl...[FULL KEY HERE]...\n-----END PRIVATE KEY-----
```

### 2. Alternative: Use Service Account JSON

Instead of individual variables, you can use a single JSON service account key:

1. Download your service account JSON from Firebase Console
2. In Vercel, create one environment variable:

```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"bismi-broilers-3ca96","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"firebase-adminsdk-uj6n4@bismi-broilers-3ca96.iam.gserviceaccount.com",...}
```

### 3. Debug Steps

After deployment, visit these URLs to check configuration:

1. `https://your-app.vercel.app/api/debug/firebase` - Check server Firebase config
2. `https://your-app.vercel.app/api/health` - Check overall health
3. Check browser console logs for client-side Firebase errors

### 4. Common Issues & Fixes

**Issue: "Invalid private key format"**
- Solution: Ensure private key has `\n` instead of actual line breaks in Vercel

**Issue: "Missing environment variables"**
- Solution: Double-check all variables are set in Vercel dashboard and redeploy

**Issue: "Firebase project not found"**
- Solution: Verify FIREBASE_PROJECT_ID matches your Firebase project exactly

**Issue: Client-side Firebase errors**
- Solution: Ensure all VITE_ prefixed variables are set correctly

### 5. Testing

1. Deploy to Vercel
2. Check `/api/debug/firebase` endpoint for configuration details
3. Test basic functionality like loading suppliers, customers, etc.
4. Check browser console for any Firebase client errors

## Key Points

- Private key must be on single line with `\n` escapes in Vercel
- All VITE_ variables are needed for client-side Firebase
- Server variables (without VITE_) are needed for Firebase Admin SDK
- Always redeploy after changing environment variables