// Simplified build script for Vercel deployment
const { execSync } = require('child_process');

console.log('Building client for Vercel...');
execSync('vite build', { stdio: 'inherit' });
console.log('Build complete!');