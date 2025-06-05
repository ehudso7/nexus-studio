import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_DOMAINS = [
  'nexstudio.dev',
  'www.nexstudio.dev',
  'app.nexstudio.dev'
];

const BLOCKED_PATHS = [
  '/.env',
  '/.git',
  '/api/admin',
  '/api/internal'
];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  
  // Block sensitive paths
  if (BLOCKED_PATHS.some(path => pathname.startsWith(path))) {
    return new NextResponse('Not Found', { status: 404 });
  }
  
  // In production, enforce domain access
  if (process.env.NODE_ENV === 'production') {
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.startsWith(`${domain}:`)
    );
    
    if (!isAllowed) {
      // Redirect to the official domain
      return NextResponse.redirect('https://nexstudio.dev');
    }
  }
  
  // Add security headers
  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Only allow nexstudio.dev in CSP
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self' https://*.nexstudio.dev; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.nexstudio.dev; " +
      "style-src 'self' 'unsafe-inline' https://*.nexstudio.dev; " +
      "img-src 'self' data: blob: https://*.nexstudio.dev https://nexstudio-assets.s3.amazonaws.com; " +
      "connect-src 'self' https://*.nexstudio.dev wss://*.nexstudio.dev; " +
      "frame-ancestors 'none';"
    );
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