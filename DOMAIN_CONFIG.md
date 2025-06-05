# NexStudio Domain Configuration

## Primary Domain
- **Production URL**: https://nexstudio.dev
- **API URL**: https://api.nexstudio.dev
- **Documentation**: https://docs.nexstudio.dev
- **Status Page**: https://status.nexstudio.dev

## Repository
- **GitHub**: https://github.com/ehudso7/nexus-studio

## Branding Changes Applied
All references have been updated from "Nexus Studio" to "NexStudio" to align with the domain nexstudio.dev:

### Updated Files:
1. **README.md** - Title and support links
2. **package.json** - Package name changed to "nexstudio"
3. **App UI** - All user-facing text updated
4. **Metadata** - SEO and social media titles
5. **Database** - Database name changed to "nexstudio"
6. **Docker** - Database configuration updated
7. **Environment** - Email domain and database URLs
8. **Documentation** - All references updated
9. **Health Checks** - Service name updated

### Access Restrictions
NexStudio is designed to be accessed ONLY through:
- **Domain**: https://nexstudio.dev (and subdomains)
- **Repository**: https://github.com/ehudso7/nexus-studio

### Local Development
For local development, the application runs on:
- Web: http://localhost:3000
- API: http://localhost:3001
- WebSocket: http://localhost:3002
- Plugin Runtime: http://localhost:3003

### Production Deployment
When deployed, all traffic should be routed through:
- Main domain: nexstudio.dev
- API subdomain: api.nexstudio.dev

## Security Configuration
To ensure the service is only accessible through the designated domain:

1. **CORS Configuration**: Set allowed origins to nexstudio.dev domains only
2. **Domain Validation**: Implement domain checking middleware
3. **SSL/TLS**: Enforce HTTPS for all production traffic
4. **CSP Headers**: Restrict resource loading to trusted domains

## Environment Variables for Production
```env
NEXT_PUBLIC_APP_URL=https://nexstudio.dev
NEXT_PUBLIC_API_URL=https://api.nexstudio.dev
CORS_ORIGINS=https://nexstudio.dev,https://api.nexstudio.dev
```