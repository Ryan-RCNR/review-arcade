/**
 * Error Handler Tests
 *
 * Tests for the standardized error handling utilities.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getErrorMessage,
  parseError,
  logError,
  handleError,
} from '../utils/errorHandler';

describe('errorHandler', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Something went wrong');
      expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    it('should return string as-is', () => {
      expect(getErrorMessage('Plain string error')).toBe('Plain string error');
    });

    it('should extract message from object with message property', () => {
      expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
    });

    it('should return default for null/undefined', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
    });

    it('should use custom fallback message', () => {
      expect(getErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
    });
  });

  describe('parseError', () => {
    it('should parse Error object', () => {
      const error = new Error('Test error');
      const result = parseError(error);

      expect(result.message).toBe('Test error');
      expect(result.originalError).toBe(error);
    });

    it('should parse string', () => {
      const result = parseError('String error');

      expect(result.message).toBe('String error');
      expect(result.originalError).toBe('String error');
    });

    it('should handle unknown error types', () => {
      const result = parseError(12345);

      expect(result.message).toBe('An unknown error occurred');
      expect(result.originalError).toBe(12345);
    });
  });

  describe('logError', () => {
    it('should log error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logError(new Error('Test'), 'TestContext');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('handleError', () => {
    it('should return ErrorResult with message', () => {
      const result = handleError(new Error('Failed'));

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed');
    });

    it('should log error when context provided', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      handleError(new Error('Test'), 'MyContext');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
