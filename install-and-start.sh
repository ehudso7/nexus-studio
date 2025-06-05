#!/bin/bash

echo "🚀 Nexus Studio - Install and Start"
echo "=================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Determine package manager
if command_exists bun; then
    PM="bun"
    PM_INSTALL="bun install"
    PM_RUN="bun run"
elif command_exists pnpm; then
    PM="pnpm"
    PM_INSTALL="pnpm install"
    PM_RUN="pnpm run"
elif command_exists yarn; then
    PM="yarn"
    PM_INSTALL="yarn install"
    PM_RUN="yarn"
else
    PM="npm"
    PM_INSTALL="npm install"
    PM_RUN="npm run"
fi

echo "Using package manager: $PM"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
cd /Users/evertonhudson/Documents/uie-project/nexus-studio

# Root dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    $PM_INSTALL
fi

# Web app
cd apps/web
if [ ! -d "node_modules" ]; then
    echo "Installing web app dependencies..."
    $PM_INSTALL
fi

# API
cd ../../services/api
if [ ! -d "node_modules" ]; then
    echo "Installing API dependencies..."
    $PM_INSTALL
fi

# Start services
echo ""
echo "🚀 Starting services..."

# Web app
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/apps/web
echo "Starting Web App on http://localhost:3000..."
$PM_RUN dev &
WEB_PID=$!

sleep 3

# API
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/services/api
echo "Starting API on http://localhost:3001..."
DATABASE_URL="postgresql://evertonhudson@localhost:5432/nexus_studio" $PM_RUN dev &
API_PID=$!

echo ""
echo "✅ All services started!"
echo "   Web: http://localhost:3000"
echo "   API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup
cleanup() {
    echo "Stopping services..."
    kill $WEB_PID $API_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT
wait