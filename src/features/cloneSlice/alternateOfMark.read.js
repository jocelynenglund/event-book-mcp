// CLONE SLICE - Alternate Of Mark (SV)
// What a clone's header says: which slice it is an alternate ending of ("alternate of S5"). null for a slice that is no clone, or whose
// original is gone. -> { sliceId, of: 'S5', ofTitle }
import { sliceRef, sliceTitle } from '../../core/projections.js';

export function alternateOfMark(state, sliceId) {
  const from = state.slices[sliceId]?.alternateOf;
  const original = from && state.slices[from];
  return original ? { sliceId, of: sliceRef(state, from), ofId: from, ofTitle: sliceTitle(original, state) } : null;
}

// The slice header's extra (board/boardSliceHeaderFields.read.js)
export const alternateOfMarkExtra = (state, slice) => { const view = alternateOfMark(state, slice.id); return view ? { kind: 'alternateOf', view } : null; };
