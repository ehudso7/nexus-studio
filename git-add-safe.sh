#!/bin/bash

# Safe git add script
echo "Adding files to git repository..."

# Add files one by one
files=(
  "README.md"
  "DOMAIN_CONFIG.md"
  "PRODUCTION_READY.md"
  "PRODUCTION_CHECKLIST.md"
  "SAAS_REQUIREMENTS.md"
  "REPOSITORY_MANIFEST.md"
  "package.json"
  "tsconfig.json"
  ".gitignore"
  ".env.example"
  "docker-compose.yml"
  "Dockerfile.api"
  "Dockerfile.web"
  "turbo.json"
  "vitest.config.ts"
  "quickstart.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Adding $file..."
    git add "$file" || echo "Failed to add $file"
  fi
done

# Add directories
dirs=(
  "apps/web/app"
  "apps/web/components"
  "apps/web/hooks"
  "apps/web/lib"
  "apps/web/public"
  "packages/auth"
  "packages/database"
  "packages/ui"
  "packages/canvas-engine"
  "packages/deployment"
  "packages/workflow-engine"
  "packages/ai-assistant"
  "packages/domain-lock"
  "services/api"
  "services/websocket"
  "services/plugin-runtime"
  "nginx"
  "docs"
  "test"
  ".github"
)

for dir in "${dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "Adding directory $dir..."
    git add "$dir" || echo "Failed to add $dir"
  fi
done

# Add remaining config files
git add apps/web/*.json apps/web/*.js apps/web/*.ts || true
git add *.sh || true

echo "Done adding files!"
git status