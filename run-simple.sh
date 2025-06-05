#!/bin/bash

echo "🚀 Starting Nexus Studio (Simple Mode)..."
echo ""

# Step 1: Install web dependencies
echo "📦 Installing Web App dependencies..."
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/apps/web
pnpm install --no-frozen-lockfile --ignore-workspace || npm install

# Step 2: Install API dependencies
echo ""
echo "📦 Installing API dependencies..."
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/services/api
pnpm install --no-frozen-lockfile --ignore-workspace || npm install

# Step 3: Start services
echo ""
echo "🚀 Starting services..."

# Start Web
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/apps/web
echo "Starting Web App..."
PORT=3000 pnpm exec next dev &
WEB_PID=$!

sleep 5

# Start API
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/services/api
echo "Starting API Server..."
DATABASE_URL="postgresql://evertonhudson@localhost:5432/nexus_studio" PORT=3001 pnpm exec tsx src/server.ts &
API_PID=$!

echo ""
echo "✅ Services started!"
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