#!/usr/bin/env node

// Frontend deployment build script
// This script prepares the frontend for deployment to static hosting platforms
// Backend is already deployed at https://bismi-main.onrender.com

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';

console.log('🚀 Building frontend for deployment...');

try {
  // Build the frontend
  console.log('📦 Running Vite build...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Copy deployment files to build directory
  if (existsSync('_redirects')) {
    execSync('cp _redirects dist/public/', { stdio: 'inherit' });
    console.log('✅ Copied _redirects for SPA routing');
  }
  
  // Create a simple health check for the deployment
  const healthCheck = `<!DOCTYPE html>
<html>
<head><title>Frontend Health Check</title></head>
<body>
  <h1>Frontend Deployed Successfully</h1>
  <p>Backend API: https://bismi-main.onrender.com</p>
  <p>Timestamp: ${new Date().toISOString()}</p>
</body>
</html>`;
  
  writeFileSync('dist/public/health.html', healthCheck);
  console.log('✅ Created health check page');
  
  console.log('🎉 Frontend build complete!');
  console.log('📁 Output directory: dist/public');
  console.log('🔗 Backend API: https://bismi-main.onrender.com');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}