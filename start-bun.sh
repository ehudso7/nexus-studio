#!/bin/bash

echo "🚀 Starting Nexus Studio with Bun..."

# Kill any existing processes
pkill -f "next dev" 2>/dev/null
pkill -f "bun run" 2>/dev/null

# Start web app with Bun
echo "🌐 Starting Web App..."
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/apps/web
bun run dev &
WEB_PID=$!

# Start API with Bun
echo "🔌 Starting API Server..."
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/services/api
DATABASE_URL="postgresql://evertonhudson@localhost:5432/nexus_studio" bun run src/server.ts &
API_PID=$!

echo "✅ Services started with Bun!"
echo "   Web: http://localhost:3000"
echo "   API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup
cleanup() {
    kill $WEB_PID $API_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT
wait