import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit tests for the storage abstraction
// Mock Firebase to prevent real SDK initialization; force localStorage mode.

vi.mock('../../firebase.js', () => ({
  authService: { getCurrentUser: () => null },
  dbService: {},
  COLLECTIONS: {},
  db: {},
}));

vi.stubEnv('VITE_FIREBASE_API_KEY', '');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');

const mockStorage = {};
vi.stubGlobal('localStorage', {
  getItem: (k) => mockStorage[k] ?? null,
  setItem: (k, v) => { mockStorage[k] = v; },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
});

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
});

describe('storage', () => {
  it('get returns null for missing key', async () => {
    const { default: storage } = await import('../../storage.js');
    expect(storage.get('nonexistent')).toBeNull();
  });

  it('set and get roundtrip', async () => {
    const { default: storage } = await import('../../storage.js');
    storage.set('test_key', { hello: 'world' });
    expect(storage.get('test_key')).toEqual({ hello: 'world' });
  });

  it('setAsync resolves without throwing in localStorage mode', async () => {
    const { default: storage } = await import('../../storage.js');
    await expect(storage.setAsync('test_key', [1, 2, 3])).resolves.not.toThrow();
  });

  it('getAsync returns stored value in localStorage mode', async () => {
    const { default: storage } = await import('../../storage.js');
    storage.set('test_key', { assets: [] });
    const result = await storage.getAsync('test_key');
    expect(result).toEqual({ assets: [] });
  });
});
