# NexStudio Repository Manifest

## 🔒 SaaS-Only Platform
**This repository contains the complete source code for NexStudio, a SaaS platform accessible ONLY at https://nexstudio.dev**

## Repository Contents

### `/apps/web` - Frontend Application
- Next.js 14 application
- Domain-locked with middleware enforcement
- Responsive UI with Tailwind CSS
- Real-time collaboration features
- Visual builder interface

### `/services` - Backend Services
- `/api` - Main API (Hono framework)
- `/websocket` - Real-time communication
- `/plugin-runtime` - WASI plugin execution

### `/packages` - Shared Packages
- `/auth` - Authentication & authorization
- `/database` - Prisma models & migrations
- `/ui` - Reusable UI components
- `/canvas-engine` - Visual builder engine
- `/deployment` - Multi-platform deployment
- `/workflow-engine` - Automation workflows
- `/ai-assistant` - AI integration
- `/domain-lock` - Domain access control

### Infrastructure
- `docker-compose.yml` - Container orchestration
- `Dockerfile.web` - Web container
- `Dockerfile.api` - API container
- `/nginx` - Reverse proxy configuration

### Configuration
- `.env.example` - Environment variables template
- `turbo.json` - Monorepo build configuration
- `pnpm-workspace.yaml` - Workspace setup
- TypeScript configurations

### Documentation
- `README.md` - Getting started
- `DOMAIN_CONFIG.md` - Domain configuration
- `SAAS_REQUIREMENTS.md` - SaaS specifications
- `PRODUCTION_READY.md` - Production status
- `/docs` - Additional documentation

### CI/CD
- `/.github/workflows` - GitHub Actions
- Testing configurations
- Deployment scripts

## 🚫 Access Restrictions

This codebase includes multiple layers of protection to ensure it only runs on nexstudio.dev:

1. **Domain Validation Middleware** - Blocks all non-nexstudio.dev requests
2. **Environment Checks** - Validates production URLs
3. **CSP Headers** - Restricts resource loading
4. **No Self-Hosting Documentation** - Platform cannot be self-hosted

## 🚀 Deployment

This platform can ONLY be deployed by NexStudio team to servers that:
- Validate domain ownership
- Use *.nexstudio.dev SSL certificates
- Route all traffic through nexstudio.dev

## 📄 License

This is proprietary software. All rights reserved by NexStudio.

---

**Official Website**: https://nexstudio.dev
**API**: https://api.nexstudio.dev
**Documentation**: https://docs.nexstudio.dev