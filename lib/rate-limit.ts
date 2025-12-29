// lib/rate-limit.ts
// Simple in-memory rate limiter for API protection

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Default limits for different endpoints
export const RATE_LIMITS = {
  // Strict limits for sensitive operations
  checkout: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  upload: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  auth: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute

  // Medium limits for write operations
  create: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  update: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute

  // Relaxed limits for read operations
  read: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute

  // Default
  default: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
};

export type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;
}

export function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'default'
): RateLimitResult {
  const config = RATE_LIMITS[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

export function getRateLimitHeaders(result: RateLimitResult, type: RateLimitType = 'default') {
  const config = RATE_LIMITS[type];
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetIn / 1000).toString(),
  };
}
