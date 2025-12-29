import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ===========================================
// BOT & AI SCRAPER PROTECTION
// ===========================================

// Known AI scrapers and bot user agents to block
const BLOCKED_USER_AGENTS = [
  // AI Crawlers
  'gptbot',
  'chatgpt',
  'ccbot',
  'anthropic',
  'claude',
  'perplexity',
  'bytespider',
  'diffbot',
  'omgili',
  'youbot',
  'cohere-ai',
  'ai2bot',
  'scrapy',
  'dataforseo',
  'magpie-crawler',
  'applebot-extended',
  'google-extended',
  'amazonbot',
  'facebookbot',

  // Headless browsers & automation
  'headlesschrome',
  'phantomjs',
  'selenium',
  'puppeteer',
  'playwright',
  'webdriver',
  'httrack',
  'wget',
  'curl',
  'python-requests',
  'python-urllib',
  'go-http-client',
  'java/',
  'libwww',
  'httpunit',
  'nutch',
  'larbin',
  'grabber',
  'scrapy',
  'mechanize',
  'aiohttp',

  // Generic bots
  'bot',
  'spider',
  'crawler',
  'scraper',
  'fetch',
];

// Suspicious patterns in requests
const SUSPICIOUS_PATTERNS = [
  /\/\.env/i,
  /\/\.git/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/xmlrpc/i,
  /\/phpmyadmin/i,
  /\/admin\.php/i,
  /\/backup/i,
  /\.sql$/i,
  /\.bak$/i,
];

// Rate limiting storage (in-memory, resets on deploy)
const ipRequestCounts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // max requests per minute per IP
const AGGRESSIVE_RATE_LIMIT = 30; // for suspicious IPs

// Track blocked IPs temporarily
const blockedIPs = new Map<string, number>();
const BLOCK_DURATION = 600000; // 10 minutes

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const cf = request.headers.get('cf-connecting-ip');

  if (cf) return cf;
  if (real) return real;
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

function isBlockedUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return true; // No user agent = suspicious

  const ua = userAgent.toLowerCase();
  return BLOCKED_USER_AGENTS.some(blocked => ua.includes(blocked));
}

function isSuspiciousRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent');

  // Check for suspicious URL patterns
  if (SUSPICIOUS_PATTERNS.some(pattern => pattern.test(pathname))) {
    return true;
  }

  // Missing common browser headers
  const acceptLanguage = request.headers.get('accept-language');
  const accept = request.headers.get('accept');

  // Real browsers always send these
  if (!acceptLanguage && !pathname.startsWith('/api/')) {
    return true;
  }

  // Check for headless browser indicators
  if (userAgent) {
    const ua = userAgent.toLowerCase();
    // Headless Chrome detection
    if (ua.includes('headless') || ua.includes('phantomjs')) {
      return true;
    }
    // Very short or generic user agent
    if (userAgent.length < 20) {
      return true;
    }
  }

  return false;
}

function checkRateLimit(ip: string, isSuspicious: boolean): boolean {
  const now = Date.now();

  // Check if IP is temporarily blocked
  const blockExpiry = blockedIPs.get(ip);
  if (blockExpiry && now < blockExpiry) {
    return false; // Still blocked
  } else if (blockExpiry) {
    blockedIPs.delete(ip); // Block expired
  }

  const limit = isSuspicious ? AGGRESSIVE_RATE_LIMIT : RATE_LIMIT_MAX;
  const record = ipRequestCounts.get(ip);

  if (!record || (now - record.timestamp) > RATE_LIMIT_WINDOW) {
    // New window
    ipRequestCounts.set(ip, { count: 1, timestamp: now });
    return true;
  }

  record.count++;

  if (record.count > limit) {
    // Block this IP temporarily
    blockedIPs.set(ip, now + BLOCK_DURATION);
    console.log(`[BOT PROTECTION] Blocked IP for rate limiting: ${ip}`);
    return false;
  }

  return true;
}

function botProtection(request: NextRequest): NextResponse | null {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent');
  const { pathname } = request.nextUrl;

  // Skip protection for static assets and API health checks
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  ) {
    return null;
  }

  // Check for blocked user agents
  if (isBlockedUserAgent(userAgent)) {
    console.log(`[BOT PROTECTION] Blocked bot: ${userAgent?.substring(0, 50)} from ${ip}`);
    return new NextResponse('Access Denied', { status: 403 });
  }

  // Check for suspicious requests
  const isSuspicious = isSuspiciousRequest(request);

  // Apply rate limiting
  if (!checkRateLimit(ip, isSuspicious)) {
    console.log(`[BOT PROTECTION] Rate limited: ${ip}`);
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '60',
      }
    });
  }

  // Log suspicious activity (but allow through if passed other checks)
  if (isSuspicious) {
    console.log(`[BOT PROTECTION] Suspicious request from ${ip}: ${pathname}`);
  }

  return null; // Allow request
}

// ===========================================
// MAIN MIDDLEWARE
// ===========================================

// Routes that require authentication (none - layouts handle auth)
const protectedRoutes: string[] = [];

// Routes that handle their own auth (don't redirect)
const selfAuthRoutes = ['/admin', '/merchant'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ===========================================
  // 1. BOT PROTECTION (runs first)
  // ===========================================
  const botBlock = botProtection(request);
  if (botBlock) {
    return botBlock;
  }

  // ===========================================
  // 2. SECURITY HEADERS
  // ===========================================
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ===========================================
  // 3. AUTH CHECKS (existing logic)
  // ===========================================

  // Check if route needs protection
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isSelfAuthRoute = selfAuthRoutes.some((route) => pathname.startsWith(route));

  // Let self-auth routes handle their own authentication
  if (isSelfAuthRoute) {
    return response;
  }

  if (!isProtectedRoute) {
    return response;
  }

  // Get auth token from cookies
  const authToken = request.cookies.get('privy-token')?.value;

  // If no token, redirect to login
  if (!authToken) {
    const loginUrl = new URL('/become-a-seller', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
