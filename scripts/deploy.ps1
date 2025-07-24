# Ireland Pay Analytics Pulse - Deployment Script (PowerShell)
# This script helps prepare and deploy the application to Vercel

Write-Host "🚀 Ireland Pay Analytics Pulse - Deployment Script" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment check passed" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green

# Run linting
Write-Host "🔍 Running linting..." -ForegroundColor Yellow
npm run lint

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: Linting found issues. Please fix them before deployment." -ForegroundColor Yellow
    $continue = Read-Host "Continue with deployment anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Deployment cancelled." -ForegroundColor Yellow
        exit 1
    }
}

# Build the application
Write-Host "🏗️  Building the application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Build failed. Please fix the build errors before deployment." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully" -ForegroundColor Green

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version
    Write-Host "✅ Vercel CLI version: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "📥 Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Deploy to Vercel
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Yellow
Write-Host "Note: You may be prompted to log in to Vercel if not already logged in." -ForegroundColor Cyan
Write-Host ""

vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Set up environment variables in your Vercel dashboard" -ForegroundColor White
    Write-Host "2. Test the deployed application" -ForegroundColor White
    Write-Host "3. Check the deployment checklist in DEPLOYMENT_CHECKLIST.md" -ForegroundColor White
    Write-Host ""
    Write-Host "For help with environment variables, see the deployment checklist." -ForegroundColor Cyan
} else {
    Write-Host "❌ Error: Deployment failed" -ForegroundColor Red
    exit 1
} 