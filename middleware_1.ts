import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/merchant'];

// Routes that handle their own auth (don't redirect)
const selfAuthRoutes = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route needs protection
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isSelfAuthRoute = selfAuthRoutes.some((route) => pathname.startsWith(route));

  // Let self-auth routes handle their own authentication
  if (isSelfAuthRoute) {
    return NextResponse.next();
  }

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get auth token from cookies
  const authToken = request.cookies.get('privy-token')?.value;

  // If no token, redirect to login
  if (!authToken) {
    const loginUrl = new URL('/become-a-seller', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};