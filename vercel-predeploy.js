// Pre-deployment script to fix TypeScript errors in server/vite.ts
const fs = require('fs');
const path = require('path');

// Path to the file that throws error during build
const viteTsPath = path.join(__dirname, 'server', 'vite.ts');

if (fs.existsSync(viteTsPath)) {
  console.log('Creating backup of server/vite.ts...');
  
  // Create backup
  fs.copyFileSync(viteTsPath, viteTsPath + '.backup');
  
  // Read the file
  let content = fs.readFileSync(viteTsPath, 'utf8');
  
  // Replace the problematic line - try multiple potential patterns
  content = content.replace(
    /allowedHosts:\s*true/g,
    'allowedHosts: ["vercel.app", ".vercel.app"]'
  );
  
  // Write the modified content
  fs.writeFileSync(viteTsPath, content);
  
  console.log('Fixed TypeScript issue in server/vite.ts');
}

// Check the database route that has an issue with Date handling
const routesPath = path.join(__dirname, 'server', 'routes.ts');

if (fs.existsSync(routesPath)) {
  console.log('Creating backup of server/routes.ts...');
  
  // Create backup
  fs.copyFileSync(routesPath, routesPath + '.backup');
  
  // Read the file
  let content = fs.readFileSync(routesPath, 'utf8');
  
  // Replace the problematic Date handling
  content = content.replace(
    /const orderDate = new Date\(order\.date\);/g,
    'if (!order.date) return false;\n            const orderDate = new Date(order.date);'
  );
  
  // Write the modified content
  fs.writeFileSync(routesPath, content);
  
  console.log('Fixed Date handling issue in server/routes.ts');
}

console.log('Pre-deployment preparation complete!');