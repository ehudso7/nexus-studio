# NexStudio - Enterprise Visual App Builder (SaaS)

🔒 **This is a SaaS-only platform accessible exclusively at https://nexstudio.dev**

## Overview

NexStudio is an enterprise-grade visual application builder that enables teams to create production-ready web, mobile, and desktop applications without traditional coding. 

**Important**: This repository contains proprietary code for a SaaS platform. It cannot be self-hosted or run outside of the nexstudio.dev domain.

## 🚀 Platform Features

- **Visual Builder**: Drag-and-drop interface with real-time preview
- **AI-Powered Development**: Generate components from natural language
- **Multi-Platform Deployment**: Deploy to Vercel, AWS, Google Cloud, and more
- **Real-Time Collaboration**: Work together with team members
- **Plugin Ecosystem**: Extend functionality with custom plugins
- **Workflow Automation**: Visual automation designer
- **Enterprise Security**: SOC 2 ready with comprehensive security features

## 🔒 Domain Lock Protection

This codebase includes multiple layers of protection to ensure it only runs on nexstudio.dev:

1. **Domain Validation Middleware** (`/apps/web/middleware.ts`)
2. **Domain Lock Package** (`/packages/domain-lock`)
3. **Environment Validation** 
4. **CSP Headers** restricting resources to nexstudio.dev

## 📁 Repository Structure

```
nexus-studio/
├── apps/
│   └── web/                 # Next.js frontend application
├── services/
│   ├── api/                 # Hono API backend
│   ├── websocket/           # Real-time features
│   └── plugin-runtime/      # Plugin execution
├── packages/
│   ├── auth/                # Authentication system
│   ├── database/            # Database models
│   ├── ui/                  # UI components
│   ├── canvas-engine/       # Visual builder
│   ├── deployment/          # Deployment integrations
│   ├── workflow-engine/     # Automation
│   ├── ai-assistant/        # AI features
│   └── domain-lock/         # Access control
├── nginx/                   # Reverse proxy config
├── docs/                    # Documentation
└── .github/                 # GitHub Actions
```

## 🛡️ Security Features

- JWT authentication with httpOnly cookies
- CSRF protection
- Rate limiting
- Input validation with Zod
- Comprehensive error handling
- Structured logging
- Health check endpoints

## 🚀 Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Hono (edge-first), GraphQL, WebSocket
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Real-time**: WebRTC, Yjs
- **AI**: OpenAI GPT-4, Anthropic Claude
- **Deployment**: Docker, Kubernetes

## 📄 License

This is proprietary software. All rights reserved by NexStudio.

---

**Official Website**: https://nexstudio.dev  
**API**: https://api.nexstudio.dev  
**Documentation**: https://docs.nexstudio.dev  

© 2024 NexStudio. This is a SaaS platform - no self-hosting permitted.