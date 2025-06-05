#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Nexus Studio...\n');

const projectRoot = __dirname;

// Check if dependencies are installed
function checkDependencies(dir) {
  return fs.existsSync(path.join(dir, 'node_modules'));
}

// Start a service
function startService(name, cwd, command, args = [], env = {}) {
  console.log(`Starting ${name}...`);
  
  const proc = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: true
  });
  
  proc.on('error', (err) => {
    console.error(`Error starting ${name}:`, err.message);
  });
  
  return proc;
}

// Main startup
async function start() {
  const processes = [];
  
  // Start web app
  const webDir = path.join(projectRoot, 'apps/web');
  if (!checkDependencies(webDir)) {
    console.log('⚠️  Web dependencies not installed. Run: cd apps/web && pnpm install');
  } else {
    const webProc = startService(
      'Web App (http://localhost:3000)',
      webDir,
      'node',
      ['node_modules/.bin/next', 'dev']
    );
    processes.push(webProc);
  }
  
  // Start API
  const apiDir = path.join(projectRoot, 'services/api');
  if (!checkDependencies(apiDir)) {
    console.log('⚠️  API dependencies not installed. Run: cd services/api && pnpm install');
  } else {
    const apiProc = startService(
      'API Server (http://localhost:3001)',
      apiDir,
      'node',
      ['node_modules/.bin/tsx', 'src/server.ts'],
      { DATABASE_URL: 'postgresql://evertonhudson@localhost:5432/nexus_studio' }
    );
    processes.push(apiProc);
  }
  
  console.log('\n✅ All services started!');
  console.log('Visit http://localhost:3000 to access Nexus Studio\n');
  console.log('Press Ctrl+C to stop all services\n');
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    processes.forEach(proc => proc.kill());
    process.exit(0);
  });
}

start().catch(console.error);