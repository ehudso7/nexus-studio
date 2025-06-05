import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import Redis from 'ioredis';
import { verifyToken } from '@nexus/auth';

const PORT = parseInt(process.env.REALTIME_PORT || '3002');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create HTTP server
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Track active connections
const connections = new Map<string, Set<any>>();

wss.on('connection', async (ws, req) => {
  console.log('New WebSocket connection');
  
  // Extract auth token from query params
  const url = new URL(req.url || '', `http://localhost:${PORT}`);
  const token = url.searchParams.get('token');
  
  if (!token) {
    ws.close(1008, 'Missing authentication token');
    return;
  }
  
  try {
    // Verify JWT token
    const payload = verifyToken(
      token,
      process.env.JWT_SECRET || 'change-this-secret'
    );
    
    // Set up Yjs WebSocket connection
    setupWSConnection(ws, req, {
      gc: true, // Enable garbage collection
      gcFilter: (item: any) => {
        // Custom garbage collection filter
        return true;
      },
    });
    
    // Track connection
    const roomId = url.pathname?.slice(1) || 'default';
    if (!connections.has(roomId)) {
      connections.set(roomId, new Set());
    }
    connections.get(roomId)?.add(ws);
    
    // Publish connection event to Redis
    await redis.publish('realtime:connections', JSON.stringify({
      type: 'connect',
      roomId,
      userId: payload.userId,
      timestamp: Date.now(),
    }));
    
    ws.on('close', async () => {
      console.log('WebSocket connection closed');
      connections.get(roomId)?.delete(ws);
      
      // Publish disconnection event to Redis
      await redis.publish('realtime:connections', JSON.stringify({
        type: 'disconnect',
        roomId,
        userId: payload.userId,
        timestamp: Date.now(),
      }));
    });
    
  } catch (error) {
    console.error('Authentication failed:', error);
    ws.close(1008, 'Invalid authentication token');
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Realtime server running on ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing connections...');
  
  wss.clients.forEach((ws) => {
    ws.close(1001, 'Server shutting down');
  });
  
  server.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});