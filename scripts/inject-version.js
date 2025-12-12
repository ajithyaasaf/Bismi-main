#!/usr/bin/env node

/**
 * Enterprise-grade build script for automatic deployment detection
 * Injects build time and deployment hash into service worker for instant cache invalidation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function injectVersionInfo() {
  const serviceWorkerPath = path.join(__dirname, '../client/public/service-worker.js');
  
  if (!fs.existsSync(serviceWorkerPath)) {
    console.log('⚠️  Service worker not found, skipping version injection');
    return;
  }

  // Generate unique deployment identifiers
  const buildTime = Date.now().toString();
  const deploymentHash = crypto.randomBytes(8).toString('hex');
  
  // Use environment variables if available (for Vercel/Netlify)
  const envHash = process.env.VERCEL_GIT_COMMIT_SHA || 
                  process.env.NETLIFY_COMMIT_HASH || 
                  process.env.CF_PAGES_COMMIT_SHA || 
                  deploymentHash;

  console.log('🚀 Injecting deployment version into service worker...');
  console.log(`   Build Time: ${buildTime}`);
  console.log(`   Deployment Hash: ${envHash}`);

  // Read service worker file
  let serviceWorkerContent = fs.readFileSync(serviceWorkerPath, 'utf8');

  // Replace placeholders with actual values
  serviceWorkerContent = serviceWorkerContent
    .replace(/\{\{BUILD_TIME\}\}/g, buildTime)
    .replace(/\{\{DEPLOYMENT_HASH\}\}/g, envHash);

  // Write updated service worker
  fs.writeFileSync(serviceWorkerPath, serviceWorkerContent);

  console.log('✅ Service worker updated with deployment version');
  
  // Also update a version file for additional checks
  const versionInfo = {
    buildTime,
    deploymentHash: envHash,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };

  fs.writeFileSync(
    path.join(__dirname, '../client/public/version.json'),
    JSON.stringify(versionInfo, null, 2)
  );

  console.log('✅ Version manifest created');
}

// Run the injection
injectVersionInfo();