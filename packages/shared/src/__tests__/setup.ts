/**
 * Vitest Test Setup
 *
 * Global setup for all tests in the shared package.
 */

import { vi } from 'vitest';

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:3001',
      MODE: 'test',
    },
  },
});

// Reset mocks between tests
beforeEach(() => {
  sessionStorageMock.clear();
  vi.clearAllMocks();
});
