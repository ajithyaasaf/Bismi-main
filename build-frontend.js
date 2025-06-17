#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';

console.log('Building frontend for Vercel deployment...');

// Clean previous build
if (existsSync('dist')) {
  rmSync('dist', { recursive: true });
}

// Build only the frontend
try {
  execSync('vite build', { stdio: 'inherit', cwd: process.cwd() });
  console.log('Frontend build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}