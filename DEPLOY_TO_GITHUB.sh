#!/bin/bash
# Deploy NexStudio to GitHub

echo "🚀 Deploying NexStudio to GitHub..."

# Clean up
rm -rf /tmp/nexstudio-deploy
mkdir -p /tmp/nexstudio-deploy

# Copy all necessary files
echo "📦 Copying files..."
cp -r apps packages services nginx docs test .github /tmp/nexstudio-deploy/
cp *.json *.md *.yml *.ts *.js .gitignore .env.example /tmp/nexstudio-deploy/ 2>/dev/null || true
cp Dockerfile.* /tmp/nexstudio-deploy/
cp -r *.sh /tmp/nexstudio-deploy/

# Initialize git in temp directory
cd /tmp/nexstudio-deploy
git init
git remote add origin https://github.com/ehudso7/nexus-studio.git

# Add all files
echo "📝 Adding files to git..."
git add -A

# Commit
echo "💾 Creating commit..."
git commit -m "NexStudio - SaaS Platform for Visual App Building

Complete enterprise-grade visual development platform accessible exclusively at https://nexstudio.dev

Features:
- Visual drag-and-drop builder
- AI-powered development
- Real-time collaboration
- Multi-platform deployment
- Plugin ecosystem
- Workflow automation

This is a SaaS-only platform with domain-lock enforcement."

# Force push
echo "⬆️ Pushing to GitHub..."
git push -f origin main

echo "✅ Deployment complete!"
echo "Repository: https://github.com/ehudso7/nexus-studio"