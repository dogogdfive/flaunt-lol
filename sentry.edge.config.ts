// sentry.edge.config.ts
// Sentry edge runtime configuration

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
});
