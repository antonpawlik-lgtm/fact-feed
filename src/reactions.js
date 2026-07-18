// Pure reaction-transition logic, shared by category and tag stat buckets.

// Same reaction again = toggle it off; anything else switches to it.
// allowToggleOff=false (double-tap) never un-reacts.
export function nextReaction(previous, requested, allowToggleOff = true) {
  if (previous === requested && !allowToggleOff) {
    return { changed: false, next: previous };
  }
  return { changed: true, next: previous === requested ? null : requested };
}

// Rebooks a stats bucket from `previous` to `next`. Math.max(0, ...) guards
// against decrementing below zero when stored data predates per-fact
// reaction tracking.
export function applyReactionDelta(stats, previous, next) {
  const s = stats || { likes: 0, dislikes: 0, dwell: 0 };
  if (previous === 'like') s.likes = Math.max(0, s.likes - 1);
  if (previous === 'dislike') s.dislikes = Math.max(0, s.dislikes - 1);
  if (next === 'like') s.likes += 1;
  if (next === 'dislike') s.dislikes += 1;
  return s;
}
