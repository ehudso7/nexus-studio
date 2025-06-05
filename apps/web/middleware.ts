import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BLOCKED_PATHS = [
  '/.env',
  '/.git',
  '/api/admin',
  '/api/internal'
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Block sensitive paths
  if (BLOCKED_PATHS.some(path => pathname.startsWith(path))) {
    return new NextResponse('Not Found', { status: 404 });
  }
  
  // Add security headers
  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'SAMEORIGIN'); // Changed from DENY to allow embedding in same origin
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Flexible CSP that works with any domain
  if (process.env.NODE_ENV === 'production') {
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com wss: https:",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests"
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', cspHeader);
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};