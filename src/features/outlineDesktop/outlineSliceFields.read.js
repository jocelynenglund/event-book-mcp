// ===========================================
// OUTLINE DESKTOP - Outline Slice Fields (SV)
// A slice's fields as the single column draws them: each name once (the ones only some stickies carry wear their types), a gap
// marked ⚠, one that comes from another sticky's field marked ←, and the ones on the traced path lit (trace: Field Trace).
// ===========================================

import { fieldsOf } from '../outline/outlineSliceRow.read.js';

export function outlineSliceFields(state, sliceId, { trace = null } = {}) {
  const slice = state.slices[sliceId];
  if (!slice) return null;
  return { sliceId, fields: fieldsOf(slice, state, trace) };
}
