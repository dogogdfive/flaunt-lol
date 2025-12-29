// sentry.server.config.ts
// Sentry server-side configuration

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Filter out common non-errors
  ignoreErrors: [
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],
});
