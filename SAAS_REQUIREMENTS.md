# NexStudio SaaS Requirements

## Domain-Locked SaaS Platform

NexStudio is configured as a SaaS-only platform accessible EXCLUSIVELY through:
- **Primary Domain**: https://nexstudio.dev
- **API Domain**: https://api.nexstudio.dev
- **App Domain**: https://app.nexstudio.dev

## Critical Files for SaaS Operation

### 1. Core Application Files ✓
- `/apps/web/*` - Next.js frontend application
- `/services/api/*` - Hono API backend
- `/services/websocket/*` - Real-time features
- `/services/plugin-runtime/*` - Plugin execution

### 2. Package Dependencies ✓
- `/packages/auth/*` - Authentication system
- `/packages/database/*` - Database models & migrations
- `/packages/ui/*` - UI component library
- `/packages/canvas-engine/*` - Visual builder engine
- `/packages/deployment/*` - Deployment integrations
- `/packages/workflow-engine/*` - Automation engine
- `/packages/ai-assistant/*` - AI features
- `/packages/domain-lock/*` - Domain access control

### 3. Infrastructure Files ✓
- `docker-compose.yml` - Container orchestration
- `Dockerfile.web` - Web app container
- `Dockerfile.api` - API container
- `/nginx/nginx.conf` - Reverse proxy & SSL

### 4. Configuration Files ✓
- `.env.example` - Environment template
- `package.json` - Root dependencies
- `turbo.json` - Monorepo build config
- `pnpm-workspace.yaml` - Workspace config
- `tsconfig.json` - TypeScript config

### 5. Security & Access Control ✓
- `/apps/web/middleware.ts` - Domain enforcement
- `/packages/domain-lock/*` - Access control
- `.gitignore` - Security exclusions
- SSL certificates (configured in nginx)

### 6. Documentation ✓
- `README.md` - Project overview
- `DOMAIN_CONFIG.md` - Domain configuration
- `PRODUCTION_READY.md` - Production status
- `PRODUCTION_CHECKLIST.md` - Launch checklist
- `/docs/*` - Additional documentation

### 7. CI/CD & Testing ✓
- `/.github/workflows/*` - GitHub Actions
- `/test/*` - Test configuration
- `vitest.config.ts` - Test runner config

## SaaS-Only Enforcement

### Domain Lock Implementation:
1. **Next.js Middleware** - Redirects non-nexstudio.dev traffic
2. **API Middleware** - Blocks requests from unauthorized domains
3. **CSP Headers** - Restricts resource loading to nexstudio.dev
4. **Environment Validation** - Ensures production URLs use nexstudio.dev

### Security Measures:
- No local installation possible
- No self-hosting documentation
- Domain validation on every request
- Encrypted environment variables
- API keys tied to nexstudio.dev domain

## Required Environment Variables

```env
# Production Required
NEXT_PUBLIC_APP_URL=https://nexstudio.dev
NEXT_PUBLIC_API_URL=https://api.nexstudio.dev
DATABASE_URL=postgresql://[production-db-url]
JWT_SECRET=[secure-random-string]
CORS_ORIGINS=https://nexstudio.dev,https://api.nexstudio.dev
```

## Deployment

The platform can ONLY be deployed to infrastructure controlled by NexStudio:
- Production servers must validate domain ownership
- SSL certificates must be for *.nexstudio.dev
- All traffic must route through nexstudio.dev

This ensures NexStudio remains a SaaS-only platform with no possibility of unauthorized hosting.