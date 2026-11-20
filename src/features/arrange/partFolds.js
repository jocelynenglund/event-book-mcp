// ===========================================
// ARRANGE - Folding a part into its bookend. A per-device view preference (like a chapter's fold), so it lives in
// localStorage, not in the book's events. Open until folded.
// ===========================================

const KEY = 'eventpad_folded_parts';
let folded = new Set();
try { folded = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { /* storage blocked */ }

export const isPartFolded = partId => folded.has(partId);

export function togglePartFolded(partId) {
  if (!folded.delete(partId)) folded.add(partId);
  try { localStorage.setItem(KEY, JSON.stringify([...folded])); } catch (e) { /* just this time */ }
}
