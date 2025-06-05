# NexStudio

The best possible app builder in the world - an enterprise-level visual development platform that enables users to build web, mobile, and desktop applications without traditional coding.

## Features

### Core Features
- **Visual Canvas Editor**: Drag-and-drop interface with real-time preview
- **Component Library**: Pre-built components with full customization
- **Responsive Design**: Build once, deploy everywhere
- **Real-time Collaboration**: Work together with WebRTC and Yjs
- **Version Control**: Built-in Git integration
- **Database Management**: Visual database designer with migrations
- **API Builder**: GraphQL and REST API generation
- **Workflow Automation**: Visual workflow designer with triggers
- **Plugin System**: Extend functionality with WASI-based plugins
- **AI Assistant**: AI-powered code generation and optimization

### AI Features
- Generate components from natural language descriptions
- Optimize code for performance and readability
- Convert screenshots to working components
- Analyze code for performance issues
- Generate tests automatically
- Get AI-powered code explanations

### Deployment Options
- Vercel
- Netlify
- AWS
- Google Cloud
- Fly.io
- Docker/Kubernetes
- Self-hosted

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Hono (edge-first), GraphQL, WebSocket
- **Database**: PostgreSQL with TimescaleDB, Prisma ORM
- **Cache**: Redis
- **Real-time**: Yjs, WebRTC, Socket.io
- **AI**: OpenAI GPT-4, Anthropic Claude
- **Deployment**: Docker, Kubernetes
- **Monitoring**: Sentry, Datadog

## Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ehudso7/nexus-studio.git
cd nexus-studio
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nexus"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-jwt-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# AI Providers
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Storage
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="nexus-assets"

# Email
RESEND_API_KEY="your-resend-api-key"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
```

4. Set up the database:
```bash
pnpm db:push
pnpm db:seed
```

5. Start the development servers:
```bash
pnpm dev
```

This will start:
- Web app: http://localhost:3000
- API server: http://localhost:3001
- WebSocket server: http://localhost:3002
- Plugin runtime: http://localhost:3003

## Project Structure

```
nexus-studio/
├── apps/
│   └── web/                 # Next.js web application
├── packages/
│   ├── database/           # Prisma schema and client
│   ├── ui/                 # Shared UI components
│   ├── auth/               # Authentication utilities
│   ├── canvas-engine/      # Visual editor engine
│   ├── workflow-engine/    # Workflow automation
│   ├── deployment/         # Deployment utilities
│   ├── collaboration/      # Real-time collaboration
│   ├── ai-assistant/       # AI features
│   └── plugin-sdk/         # Plugin development kit
├── services/
│   ├── api/                # GraphQL/REST API
│   ├── websocket/          # WebSocket server
│   └── plugin-runtime/     # Plugin execution runtime
└── docker/                 # Docker configurations
```

## Development

### Running Tests
```bash
pnpm test
```

### Building for Production
```bash
pnpm build
```

### Linting
```bash
pnpm lint
```

### Type Checking
```bash
pnpm typecheck
```

## Deployment

### Using Docker
```bash
docker compose up -d
```

### Manual Deployment
1. Build the project:
```bash
pnpm build
```

2. Set production environment variables
3. Start the services:
```bash
pnpm start
```

## Contributing

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Documentation: [docs.nexstudio.dev](https://docs.nexstudio.dev)
- Discord: [discord.gg/nexstudio](https://discord.gg/nexstudio)
- Email: support@nexstudio.dev