#!/bin/bash

echo "🚀 Starting Nexus Studio..."
echo ""

# Clean up any existing lockfiles
rm -f apps/web/pnpm-lock.yaml services/api/pnpm-lock.yaml

# Install and run web
echo "📦 Installing Web dependencies..."
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/apps/web
pnpm install

echo "🌐 Starting Web App..."
pnpm dev &
WEB_PID=$!

# Install and run API
echo ""
echo "📦 Installing API dependencies..."
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/services/api
pnpm install

echo "🔌 Starting API Server..."
DATABASE_URL="postgresql://evertonhudson@localhost:5432/nexus_studio" pnpm dev &
API_PID=$!

echo ""
echo "✅ Services starting..."
echo "   Web: http://localhost:3000"
echo "   API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop"

cleanup() {
    kill $WEB_PID $API_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT
wait