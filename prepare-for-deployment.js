/**
 * Deployment Preparation Script for Ireland Pay Analytics
 * 
 * This script helps prepare the project for Vercel deployment by:
 * 1. Verifying environment variables are available
 * 2. Ensures Supabase integration is properly configured
 * 3. Creates any necessary project files for deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Preparing Ireland Pay Analytics for Vercel Deployment...');

// Check if .env.local exists, and create it if not
const envLocalPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.log('⚙️ Creating .env.local file for local development...');
  const envContent = `NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_PROJECT_ID=your-project-id`;

  fs.writeFileSync(envLocalPath, envContent, 'utf8');
  console.log('✅ Created .env.local template. Please update with your actual Supabase credentials before running locally.');
}

// Verify package.json has all required dependencies
console.log('📦 Checking package dependencies...');
const packageJson = require('./package.json');

// Check for required dependencies
const requiredDeps = ['@supabase/supabase-js', '@supabase/ssr', 'next'];
let missingDeps = [];

requiredDeps.forEach(dep => {
  if (!packageJson.dependencies[dep]) {
    missingDeps.push(dep);
  }
});

if (missingDeps.length > 0) {
  console.log(`⚠️ Missing required dependencies: ${missingDeps.join(', ')}`);
  console.log('🔧 Installing missing dependencies...');
  
  try {
    execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully.');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Create a .vercelignore file to exclude unnecessary files
const vercelIgnorePath = path.join(__dirname, '.vercelignore');
if (!fs.existsSync(vercelIgnorePath)) {
  console.log('📝 Creating .vercelignore file...');
  const ignoreContent = `# Development files
.git
.github
.vscode
node_modules

# Testing files
__tests__
test
tests
*.test.js
*.spec.js

# Local environment files
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build artifacts
.next
.vercel
dist

# Log files
*.log
npm-debug.log*

# Test scripts
test-*.js`;

  fs.writeFileSync(vercelIgnorePath, ignoreContent, 'utf8');
  console.log('✅ Created .vercelignore file.');
}

// Ensure build script exists in package.json
if (!packageJson.scripts.build) {
  console.error('❌ Missing build script in package.json. Please add: "build": "next build"');
  process.exit(1);
}

console.log('');
console.log('🎉 Preparation complete! You can now deploy to Vercel.');
console.log('');
console.log('⚠️ IMPORTANT: Before deploying, make sure to:');
console.log('1. Set the following environment variables in your Vercel project:');
console.log('   - NEXT_PUBLIC_SUPABASE_URL');
console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('   - NEXT_PUBLIC_SUPABASE_PROJECT_ID');
console.log('2. Ensure your Supabase Edge Functions are deployed and accessible.');
console.log('');
console.log('⚙️ To deploy, run: vercel --prod');
