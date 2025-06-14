# Critical Firebase Fix for Vercel Deployment

## The Problem
Your Firebase Admin SDK is failing to initialize on Vercel, causing 500 errors. The individual environment variable approach is having issues with private key formatting.

## Solution: Use Service Account JSON

### Step 1: Create Service Account JSON
Create a single environment variable with your complete service account JSON:

**Variable Name:** `FIREBASE_SERVICE_ACCOUNT_KEY`

**Value (single line JSON):**
```json
{"type":"service_account","project_id":"bismi-broilers-3ca96","private_key_id":"YOUR_KEY_ID","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCplrPwoPf12SJ0\nl9FI7wBF/8e7MKsaBbUVz1TMJx1SsbJbGgzLyL78YyOYhrAYx2RxBJcnYfQrsqv0\nIVGAAJeNqpR0tKwJOimbvEN+ly01pFet4CAZLxwFGfVGz2LY0IWCT0Ez1xftlO5z\n7S7h9eb0JLVqMK/t1gBzMziHRKBuwwLuiFPjNx+wdsqYaEGyB9bL0uYAju28m1hP\nzRgDg5jWghUugkGaO2m17Tk4HNuT0nP2WM0/Ig4OQQpez+5X3HF93tKPM0gm39lz\nVwyXajiGqBDpx2vES5wOfC1Cd43b0su7SB7deRqFZVKwkEfqZFYDGpqL8NHbxHx+\nIrwjvnurAgMBAAECggEAEdzc0TCzTYL0fSFsmukHhf2y7YMaFQTl...YOUR_FULL_PRIVATE_KEY_HERE...\n-----END PRIVATE KEY-----","client_email":"firebase-adminsdk-uj6n4@bismi-broilers-3ca96.iam.gserviceaccount.com","client_id":"YOUR_CLIENT_ID","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-uj6n4%40bismi-broilers-3ca96.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
```

### Step 2: Get Your Complete Service Account
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the entire JSON content into the FIREBASE_SERVICE_ACCOUNT_KEY variable

### Step 3: Keep These Variables Too
Keep all your existing VITE_ variables for the frontend:
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- etc.

### Step 4: Remove Individual Firebase Variables (Optional)
You can remove these since we're using the service account JSON:
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL  
- FIREBASE_PRIVATE_KEY

### Step 5: Deploy and Test
After setting the service account JSON variable, redeploy and test.

## Alternative: Debug Current Setup
If you prefer to keep individual variables, visit:
`https://your-app.vercel.app/api/debug/firebase`

This will show exactly what's wrong with the current Firebase configuration.