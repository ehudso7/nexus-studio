# NexStudio Quick Start Guide

## Prerequisites Installed ✅
- Node.js 18+
- PostgreSQL
- Redis

## Quick Start

### 1. Open Terminal #1 - Start Web App
```bash
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/apps/web
npm install next@14.1.0 react@18.2.0 react-dom@18.2.0
npm run dev
```

The web app will start on http://localhost:3000

### 2. Open Terminal #2 - Start API Server
```bash
cd /Users/evertonhudson/Documents/uie-project/nexus-studio/services/api
export DATABASE_URL="postgresql://evertonhudson@localhost:5432/nexstudio"
npm install tsx hono @hono/node-server
npx tsx src/server.ts
```

The API will start on http://localhost:3001

### 3. Access the Platform
Visit http://localhost:3000 in your browser

## Features Available

1. **Landing Page** - Professional landing with pricing
2. **Authentication** - Sign up and sign in
3. **Dashboard** - Project management
4. **Visual Builder** - Drag-and-drop interface
5. **AI Assistant** - Code generation (requires API keys)

## Troubleshooting

If you encounter issues:

1. Make sure PostgreSQL is running
2. Check that the database exists: `createdb nexstudio`
3. Ensure no other services are using ports 3000 or 3001

## Next Steps

1. Sign up for an account
2. Create your first project
3. Use the visual builder to create apps
4. Deploy to production platforms