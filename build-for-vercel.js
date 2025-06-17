#!/usr/bin/env node

// Build script for Vercel deployment
// Ensures clean build without Firebase client SDK remnants

import { execSync } from 'child_process';
import { rmSync, existsSync, writeFileSync } from 'fs';
import path from 'path';

console.log('🚀 Starting Vercel build process...');

// 1. Clean any existing build artifacts
console.log('🧹 Cleaning build artifacts...');
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}

// 2. Clean node_modules cache for Firebase client modules
console.log('🧹 Cleaning Firebase client cache...');
try {
  rmSync('node_modules/.vite', { recursive: true, force: true });
} catch (e) {
  // Ignore if doesn't exist
}

// 3. Create environment configuration for production
console.log('⚙️ Setting up production environment...');
const envConfig = `VITE_API_BASE_URL=https://bismi-main.onrender.com
VITE_ENVIRONMENT=production
NODE_ENV=production`;

writeFileSync('.env.production', envConfig);

// 4. Build the application
console.log('🔨 Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// 5. Create Vercel deployment configuration
console.log('📝 Creating Vercel configuration...');
const vercelConfig = {
  "version": 2,
  "buildCommand": "node build-for-vercel.js",
  "outputDirectory": "dist/public",
  "installCommand": "npm install",
  "framework": null,
  "env": {
    "VITE_API_BASE_URL": "https://bismi-main.onrender.com",
    "VITE_ENVIRONMENT": "production"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://bismi-main.onrender.com/api/$1"
    }
  ]
};

writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));

console.log('✅ Vercel build process completed successfully!');
console.log('📦 Ready for deployment to Vercel');
console.log('🔗 API calls will be proxied to: https://bismi-main.onrender.com');