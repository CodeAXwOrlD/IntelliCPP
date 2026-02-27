#!/bin/bash

echo "=========================================="
echo "  CodeFlow Application Status Report"
echo "=========================================="
echo

echo "🔍 Checking System Requirements..."
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "CMake: $(cmake --version | head -1)"
echo "GCC: $(g++ --version | head -1)"
echo

echo "📁 Checking Build Artifacts..."
if [ -f "dist/codeflow_native.node" ]; then
    echo "✅ Native module: dist/codeflow_native.node ($(du -h dist/codeflow_native.node | cut -f1))"
else
    echo "❌ Native module not found"
fi

if [ -f "frontend/build/index.html" ]; then
    echo "✅ Frontend build: frontend/build/index.html"
else
    echo "❌ Frontend build not found"
fi

if [ -f "data/cpp_keywords.txt" ] && [ -f "data/stl_functions.json" ]; then
    echo "✅ Data files: present"
else
    echo "❌ Data files missing"
fi
echo

echo "🧪 Testing Native Module..."
node test_app.js 2>/dev/null
echo

echo "🌐 Checking Server Status..."
if curl -s http://localhost:3001/health >/dev/null 2>&1; then
    echo "✅ Backend API server: running on port 3001"
else
    echo "ℹ️  Backend API server: not running (start with: cd backend && npm run server)"
fi

if curl -s http://localhost:5000 >/dev/null 2>&1; then
    echo "✅ Frontend dev server: running on port 5000"
else
    echo "ℹ️  Frontend dev server: not running (start with: cd frontend && npm start)"
fi

echo
echo "🚀 To run the application:"
echo "   Option 1 - Electron App:"
echo "     npm start"
echo
echo "   Option 2 - Web Version (Recommended for testing):"
echo "     cd backend && npm run server     # Start backend (port 3001)"
echo "     cd frontend && npm start        # Start frontend (port 5000)"
echo "     Open http://localhost:5000 in browser"
echo
echo "   Option 3 - Build and Test:"
echo "     npm run build                    # Rebuild everything"
echo "     npm test                         # Run all tests"
echo
echo "=========================================="