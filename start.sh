#!/bin/bash

echo "🚀 Starting Nexus Studio..."

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill any existing processes
pkill -f "next dev" 2>/dev/null
pkill -f "tsx watch" 2>/dev/null

# Start services
echo "📦 Starting Web App on http://localhost:3000..."
cd "$SCRIPT_DIR/apps/web" && npx next@14.1.0 dev &

echo "🔌 Starting API Server on http://localhost:3001..."
cd "$SCRIPT_DIR/services/api" && DATABASE_URL="postgresql://evertonhudson@localhost:5432/nexus_studio" npx tsx src/server.ts &

echo "✅ All services started!"
echo "Visit http://localhost:3000 to access Nexus Studio"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
wait