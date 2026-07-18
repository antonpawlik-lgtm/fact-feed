import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readJSON, writeJSON } from '../src/storage.js';

function mockLocalStorage(overrides = {}) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    ...overrides,
  };
  return store;
}

beforeEach(() => {
  mockLocalStorage();
});

test('round-trips JSON values', () => {
  assert.equal(writeJSON('key', { a: 1 }), true);
  assert.deepEqual(readJSON('key', null), { a: 1 });
});

test('returns fallback for missing keys', () => {
  assert.deepEqual(readJSON('missing', { fallback: true }), { fallback: true });
});

test('returns fallback for corrupt JSON', () => {
  localStorage.setItem('bad', '{not json');
  assert.deepEqual(readJSON('bad', []), []);
});

test('survives a throwing localStorage (quota / private mode)', () => {
  mockLocalStorage({
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('quota exceeded');
    },
  });
  assert.deepEqual(readJSON('key', 'fallback'), 'fallback');
  assert.equal(writeJSON('key', 123), false);
});
