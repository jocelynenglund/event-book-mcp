// ===========================================
// OUTLINE DESKTOP - Outline Book Counts (SV)
// What the whole book holds, under the rail's chapters: its slices, its scenarios and its completeness gaps (fields with no
// source), the last one a tap to the list of them.
// ===========================================

import { gapCount } from '../fieldSources/rules.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function outlineBookCounts(state) {
  const ids = state.sliceOrder.filter(id => state.slices[id]);
  const gaps = gapCount(state, ids);
  return {
    slices: plural(ids.length, 'slice', 'slices'),
    scenarios: plural(Object.keys(state.scenarios).length, 'scenario', 'scenarios'),
    gaps: gaps ? plural(gaps, 'gap', 'gaps') : 'no gaps', hasGaps: gaps > 0
  };
}
