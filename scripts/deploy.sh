#!/bin/bash

# Ireland Pay Analytics Pulse - Deployment Script
# This script helps prepare and deploy the application to Vercel

echo "🚀 Ireland Pay Analytics Pulse - Deployment Script"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Environment check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Run linting
echo "🔍 Running linting..."
npm run lint

if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Linting found issues. Please fix them before deployment."
    read -p "Continue with deployment anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Build the application
echo "🏗️  Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed. Please fix the build errors before deployment."
    exit 1
fi

echo "✅ Build completed successfully"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📥 Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo "Note: You may be prompted to log in to Vercel if not already logged in."
echo ""

vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Set up environment variables in your Vercel dashboard"
    echo "2. Test the deployed application"
    echo "3. Check the deployment checklist in DEPLOYMENT_CHECKLIST.md"
    echo ""
    echo "For help with environment variables, see the deployment checklist."
else
    echo "❌ Error: Deployment failed"
    exit 1
fi 