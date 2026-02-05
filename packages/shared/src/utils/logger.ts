/**
 * Logger Utility
 *
 * Simple logging framework with log levels and environment awareness
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
  minLevel?: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default to only logging errors in production
const defaultMinLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'error';

/**
 * Create a logger instance with optional prefix
 *
 * @example
 * const log = createLogger({ prefix: 'WebSocket' });
 * log.info('Connected');
 * log.error('Connection failed', error);
 */
export function createLogger(options: LoggerOptions = {}) {
  const { prefix, enabled = true, minLevel = defaultMinLevel } = options;

  const shouldLog = (level: LogLevel): boolean => {
    if (!enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
  };

  const formatMessage = (level: LogLevel, message: string): string => {
    const timestamp = new Date().toISOString();
    const prefixStr = prefix ? `[${prefix}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${prefixStr} ${message}`;
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.debug(formatMessage('debug', message), ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog('info')) {
        console.info(formatMessage('info', message), ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', message), ...args);
      }
    },
    error: (message: string, ...args: unknown[]) => {
      if (shouldLog('error')) {
        console.error(formatMessage('error', message), ...args);
      }
    },
  };
}

// Default logger instance
export const logger = createLogger();
