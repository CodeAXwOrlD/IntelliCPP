#!/bin/bash

# CodeFlow Autocomplete - Quick Build & Run Script
# Usage: bash setup.sh

set -e

# Ensure script runs from its containing directory (so npm installs run in correct folders)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 CodeFlow AI Autocomplete - Setup Script"
echo "=========================================="

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Install from https://nodejs.org/${NC}"
    exit 1
fi

echo -e "${BLUE}✓${NC} Node.js $(node --version) found"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}⚠️  npm not found${NC}"
    exit 1
fi

echo -e "${BLUE}✓${NC} npm $(npm --version) found"

# Install root dependencies
echo -e "${BLUE}📦 Installing root dependencies...${NC}"
npm install

# Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
npm install
cd ..

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..

# Build backend (optional - skipped by default)
if [ "${BUILD_BACKEND}" = "1" ]; then
    echo -e "${BLUE}🔨 Building C++ backend...${NC}"
    npm run build:backend || echo -e "${YELLOW}⚠️  Backend build failed (optional for demo)${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping C++ backend build. To enable, run with BUILD_BACKEND=1 or run 'npm run build:backend' manually.${NC}"
fi

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}🎯 Next steps:${NC}"
echo "   npm start          - Start dev server"
echo "   npm run build      - Production build"
echo "   npm test           - Run all tests"
echo ""
echo -e "${GREEN}💡 Type 'vector v;' then 'v.' to test autocomplete!${NC}"
