// lib/logger.ts
// Structured logging utility

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Set minimum log level (can be configured via env)
const MIN_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

// Color codes for terminal
const colors = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m',
};

function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;

  const formattedMessage = formatMessage(level, message, context);
  const color = colors[level];

  switch (level) {
    case 'debug':
      console.debug(`${color}${formattedMessage}${colors.reset}`);
      break;
    case 'info':
      console.info(`${color}${formattedMessage}${colors.reset}`);
      break;
    case 'warn':
      console.warn(`${color}${formattedMessage}${colors.reset}`);
      break;
    case 'error':
      console.error(`${color}${formattedMessage}${colors.reset}`);
      break;
  }
}

// Main logger object
export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),

  // API request logging
  api: (method: string, path: string, context?: LogContext) => {
    log('info', `${method} ${path}`, context);
  },

  // Database query logging
  db: (operation: string, table: string, context?: LogContext) => {
    log('debug', `DB ${operation} on ${table}`, context);
  },

  // Transaction logging
  tx: (action: string, context?: LogContext) => {
    log('info', `TX ${action}`, context);
  },

  // Auth logging
  auth: (action: string, walletAddress?: string, context?: LogContext) => {
    log('info', `AUTH ${action}`, { walletAddress: walletAddress?.slice(0, 8) + '...', ...context });
  },

  // Payment logging
  payment: (action: string, context?: LogContext) => {
    log('info', `PAYMENT ${action}`, context);
  },

  // Error with stack trace
  exception: (error: Error, context?: LogContext) => {
    log('error', error.message, {
      ...context,
      stack: error.stack,
      name: error.name,
    });
  },
};

// Request context helper for API routes
export function createRequestLogger(requestId: string) {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { requestId, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { requestId, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { requestId, ...context }),
    error: (message: string, context?: LogContext) =>
      logger.error(message, { requestId, ...context }),
  };
}

// Performance timing helper
export function createTimer(label: string) {
  const start = performance.now();
  return {
    end: (context?: LogContext) => {
      const duration = Math.round(performance.now() - start);
      logger.debug(`${label} completed`, { duration: `${duration}ms`, ...context });
      return duration;
    },
  };
}
