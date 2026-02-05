/**
 * Error Handler Utility
 *
 * Standardized error handling for consistent error messages and logging
 */

export interface ErrorResult {
  message: string;
  isNetworkError: boolean;
  isTimeoutError: boolean;
  isAuthError: boolean;
  originalError: unknown;
}

/**
 * Extract a user-friendly error message from an error object
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      return 'Request timed out. Please try again.';
    }
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Network error. Please check your connection.';
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Please log in to continue.';
    }
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return 'You do not have permission to perform this action.';
    }
    if (error.message.includes('404') || error.message.includes('Not found')) {
      return 'The requested resource was not found.';
    }
    if (error.message.includes('500') || error.message.includes('Internal')) {
      return 'Server error. Please try again later.';
    }
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred.';
}

/**
 * Parse error into a structured result object
 */
export function parseError(error: unknown): ErrorResult {
  const message = getErrorMessage(error);

  return {
    message,
    isNetworkError: message.includes('Network') || message.includes('connection'),
    isTimeoutError: message.includes('timed out') || (error instanceof Error && error.name === 'AbortError'),
    isAuthError: message.includes('log in') || message.includes('permission'),
    originalError: error,
  };
}

/**
 * Log error with context for debugging
 */
export function logError(context: string, error: unknown): void {
  const parsed = parseError(error);

  // Only log to console in development or if it's a server error
  if (import.meta.env.DEV || parsed.message.includes('Server error')) {
    console.error(`[${context}]`, parsed.message, parsed.originalError);
  }
}

/**
 * Handle error with logging and return user-friendly message
 */
export function handleError(context: string, error: unknown): string {
  logError(context, error);
  return getErrorMessage(error);
}
