#!/bin/bash

# Verification script for LLM Skills project
# This script checks if the project is properly set up

set -e

echo "🔍 Verifying LLM Skills Project Setup..."
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi
NODE_VERSION=$(node -v)
echo "  Found Node.js: $NODE_VERSION"

# Check npm
echo "✓ Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
NPM_VERSION=$(npm -v)
echo "  Found npm: $NPM_VERSION"

# Check if node_modules exists
echo "✓ Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed. Running npm install..."
    npm install
else
    echo "  Dependencies installed ✓"
fi

# Check TypeScript
echo "✓ Checking TypeScript..."
if [ ! -d "node_modules/typescript" ]; then
    echo "❌ TypeScript not found in node_modules"
    exit 1
fi
echo "  TypeScript found ✓"

# Check Electron
echo "✓ Checking Electron..."
if [ ! -d "node_modules/electron" ]; then
    echo "❌ Electron not found in node_modules"
    exit 1
fi
echo "  Electron found ✓"

# Build TypeScript
echo "✓ Building TypeScript..."
npm run build
if [ $? -eq 0 ]; then
    echo "  Build successful ✓"
else
    echo "❌ Build failed"
    exit 1
fi

# Check dist directory
echo "✓ Checking build output..."
if [ ! -d "dist" ]; then
    echo "❌ dist directory not found"
    exit 1
fi

if [ ! -f "dist/main/index.js" ]; then
    echo "❌ Main entry file not built"
    exit 1
fi
echo "  Build output verified ✓"

echo ""
echo "✅ All checks passed!"
echo ""
echo "You can now run the application with:"
echo "  npm run dev"
echo ""
echo "Or start without dev tools:"
echo "  npm start"
echo ""

