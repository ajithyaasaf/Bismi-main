import { execSync } from 'child_process';

// Build configuration for different deployment targets
const config = {
  // Vercel frontend build
  vercel: {
    command: 'vite build',
    output: 'dist/public'
  },
  
  // Render backend build
  render: {
    command: 'esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outdir=dist',
    output: 'dist/production.js'
  },
  
  // Combined build
  all: {
    commands: [
      'vite build',
      'esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outdir=dist'
    ]
  }
};

// Execute build based on environment
const target = process.argv[2] || 'all';

if (config[target]) {
  console.log(`Building for: ${target}`);
  
  if (config[target].commands) {
    config[target].commands.forEach(cmd => {
      console.log(`Executing: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
    });
  } else {
    console.log(`Executing: ${config[target].command}`);
    execSync(config[target].command, { stdio: 'inherit' });
  }
  
  console.log(`✓ Build completed for ${target}`);
} else {
  console.error(`Unknown build target: ${target}`);
  console.log('Available targets:', Object.keys(config).join(', '));
  process.exit(1);
}