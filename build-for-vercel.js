// Build script for Vercel deployment
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create build directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Build the client
console.log('Building client...');
execSync('vite build', { stdio: 'inherit' });

// Copy client files to dist
console.log('Copying client files...');
fs.cpSync('dist/client', 'dist', { recursive: true });

// Build the server
console.log('Building server...');
execSync('esbuild server/vercel.ts --platform=node --packages=external --bundle --outdir=dist/server', { stdio: 'inherit' });

// Copy vercel.json to dist
console.log('Copying vercel.json...');
fs.copyFileSync('vercel.json', 'dist/vercel.json');

console.log('Build complete!');