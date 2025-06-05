#!/bin/bash

# Simple direct startup - no monorepo complexity

echo "🚀 Starting Nexus Studio..."

# Terminal 1 - Web
osascript -e 'tell app "Terminal" to do script "cd /Users/evertonhudson/Documents/uie-project/nexus-studio/apps/web && pnpm install --ignore-workspace && pnpm exec next dev"'

# Terminal 2 - API  
osascript -e 'tell app "Terminal" to do script "cd /Users/evertonhudson/Documents/uie-project/nexus-studio/services/api && export DATABASE_URL=\"postgresql://evertonhudson@localhost:5432/nexus_studio\" && pnpm install --ignore-workspace && pnpm exec tsx src/server.ts"'

echo "✅ Opening services in new Terminal windows..."
echo ""
echo "Web App: http://localhost:3000"
echo "API Server: http://localhost:3001"