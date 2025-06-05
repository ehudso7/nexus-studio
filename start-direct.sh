#!/bin/bash

echo "🚀 Starting Nexus Studio (Direct Mode)..."

# Install dependencies directly without npm/npx
echo "📦 Installing dependencies..."

# Web app dependencies
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/apps/web
if [ ! -d "node_modules" ]; then
    echo "Installing web dependencies..."
    /usr/local/bin/pnpm install || yarn install || npm install
fi

# API dependencies
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/services/api
if [ ! -d "node_modules" ]; then
    echo "Installing API dependencies..."
    /usr/local/bin/pnpm install || yarn install || npm install
fi

# Start services using node directly
echo "🌐 Starting Web App..."
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/apps/web
node node_modules/.bin/next dev &
WEB_PID=$!

echo "🔌 Starting API Server..."
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/services/api
DATABASE_URL="postgresql://evertonhudson@localhost:5432/nexus_studio" node node_modules/.bin/tsx src/server.ts &
API_PID=$!

echo "✅ Services started!"
echo "   Web: http://localhost:3000 (PID: $WEB_PID)"
echo "   API: http://localhost:3001 (PID: $API_PID)"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
    echo "Stopping services..."
    kill $WEB_PID 2>/dev/null
    kill $API_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT

# Wait
wait