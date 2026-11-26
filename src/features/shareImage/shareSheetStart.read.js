// ===========================================
// SHARE IMAGE - Share Sheet Start: whether the sheet can open on this book, and what it starts on.
// ===========================================

import { shareScopes } from './shareScopes.read.js';

// -> { empty: true when there is nothing to share (no slice), scope: 'slice:<id>' from a slice's menu, a chapter's
// id from a chapter's menu (a chapter that is gone, or has no slice, starts as usual), else the whole model for a
// small book or its first chapter }
// A book with only a sketch can still share the Pad's picture (fromPad).
export function shareSheetStart(state, sliceId = null, chapterId = null, { fromPad = false } = {}) {
  const sketched = !!state.pad && (Object.keys(state.pad.notes).length > 0 || Object.keys(state.pad.frames).length > 0);
  return { empty: !Object.keys(state.slices).length && !(fromPad && sketched), scope: sliceId ? 'slice:' + sliceId : shareScopes(state, chapterId).picked };
}
