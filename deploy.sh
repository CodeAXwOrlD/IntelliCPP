#!/bin/bash

echo "🚀 Deploying IntelliCPP to Vercel with STL fixes..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to production
echo "🌐 Deploying to Vercel..."
cd /home/indmadmax/Downloads/IntelliCPP

# Deploy with force to ensure latest changes are deployed
vercel --prod --force

echo "✅ Deployment complete!"
echo "🎯 Your updated app with STL fixes is now live at:"
echo "https://intellcpp.vercel.app"
echo ""
echo "📝 What's fixed:"
echo "- ✅ #include <stack> now shows 'stack' + push, pop, top, empty, size"
echo "- ✅ #include <vector> now shows 'vector' + push_back, pop_back, at, front, back"
echo "- ✅ #include <queue> now shows 'queue' + push, pop, front, back, empty, size"
echo "- ✅ #include <map> now shows 'map' + insert, erase, find, count, empty, size"
echo "- ✅ #include <set> now shows 'set' + insert, erase, find, count, empty, size"
echo "- ✅ #include <string> now shows 'string' + length, substr, find, replace, append"
echo ""
echo "🎉 No more wrong suggestions like 'static' or vector methods for stack!"
