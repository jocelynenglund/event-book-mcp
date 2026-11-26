// CLONE SLICE - Slice Endings Label (SV)
// The small label on an original slice that has alternate endings: "S5 · 2 endings" (its own ending counts, so one alternate makes 2).
// null when nothing is an alternate of it. adjacent: how many of them sit right after it, as made.
// -> { sliceId, ref: 'S5', endings: 2, adjacent: 1 }
import { sliceRef, getOrderedSlices } from '../../core/projections.js';

export function sliceEndingsLabel(state, sliceId) {
  const alternates = Object.values(state.slices).filter(s => s.alternateOf === sliceId);
  if (!alternates.length || !state.slices[sliceId]) return null;
  const order = getOrderedSlices(state).map(s => s.id), at = order.indexOf(sliceId);
  let adjacent = 0;
  while (state.slices[order[at + adjacent + 1]]?.alternateOf === sliceId) adjacent++;
  return { sliceId, ref: sliceRef(state, sliceId), endings: alternates.length + 1, adjacent };
}

// The slice header's extra (board/boardSliceHeaderFields.read.js)
export const sliceEndingsLabelExtra = (state, slice) => { const view = sliceEndingsLabel(state, slice.id); return view ? { kind: 'endings', view } : null; };
