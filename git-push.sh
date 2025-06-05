#!/bin/bash

# Add files in batches
echo "Adding configuration files..."
git add .gitignore .env.example package.json tsconfig.json turbo.json pnpm-workspace.yaml

echo "Adding documentation..."
git add README.md *.md

echo "Adding source directories..."
git add apps/
git add packages/
git add services/
git add docs/
git add .github/

echo "Adding other files..."
git add nginx/
git add test/
git add *.json *.js *.ts

# Create commit
git commit -m "fix: restore all corrupted files and fix empty file issues

- Fixed .env.local and .env.example with proper configurations
- Restored all package.json files across monorepo
- Fixed TypeScript and build configurations
- Restored UI components and source files
- Fixed GraphQL schema and resolvers
- Restored web app layout and pages
- Fixed all 48+ corrupted/empty files
- Verified domain-lock to nexstudio.dev

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main