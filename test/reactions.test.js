import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextReaction, applyReactionDelta } from '../src/reactions.js';

test('first reaction sets it', () => {
  assert.deepEqual(nextReaction(null, 'like'), { changed: true, next: 'like' });
});

test('same reaction again toggles it off', () => {
  assert.deepEqual(nextReaction('like', 'like'), { changed: true, next: null });
});

test('double-tap never un-likes', () => {
  assert.deepEqual(nextReaction('like', 'like', false), { changed: false, next: 'like' });
});

test('switching reaction replaces it', () => {
  assert.deepEqual(nextReaction('like', 'dislike'), { changed: true, next: 'dislike' });
});

test('delta books a new like', () => {
  const stats = applyReactionDelta(undefined, null, 'like');
  assert.equal(stats.likes, 1);
  assert.equal(stats.dislikes, 0);
});

test('delta rebooks like -> dislike without double counting', () => {
  const stats = { likes: 1, dislikes: 0, dwell: 0 };
  applyReactionDelta(stats, 'like', 'dislike');
  assert.equal(stats.likes, 0);
  assert.equal(stats.dislikes, 1);
});

test('delta toggling off removes the like', () => {
  const stats = { likes: 1, dislikes: 0, dwell: 0 };
  applyReactionDelta(stats, 'like', null);
  assert.equal(stats.likes, 0);
  assert.equal(stats.dislikes, 0);
});

test('delta never decrements below zero on legacy data', () => {
  const stats = { likes: 0, dislikes: 0, dwell: 0 };
  applyReactionDelta(stats, 'like', null); // stored reaction without stats backing
  assert.equal(stats.likes, 0);
});
