// ===========================================
// FIELD SOURCES - Field Gap Sheet (SV)
// What the sheet a ⚠ opens says about one field of one sticky in one slice: why it has no source and the fix, and
// whether this device may set it by the system (not on a read-only book), and whether it is asking how.
// null once the field has a source after all (nothing to say); { tidy: true, elementId } for a piece of prose (the tidy sheet). readOnly, asking, how: the device's own state.
// ===========================================

import { projectState } from '../../core/projections.js';
import { fieldSources } from './rules.js';

export function fieldGapSheet(state, elementId, sliceId, field, { readOnly = false, asking = false, how = '' } = {}) {
  const g = fieldSources(state).at.get(`${sliceId}|${elementId}|${field}`);
  if (!g) return null;
  if (g.kind === 'tidy') return { tidy: true, elementId };   // a piece of a field written as prose: it is tidied, not given a source
  return { elementId, sliceId, field, sticky: g.sticky, why: g.why, fix: g.fix, canMark: !readOnly && g.field !== '(the event)', asking: !readOnly && asking, how };
}

// The same, read from the book as it is now (a tap on a ⚠ asks the open book)
export const fieldGapSheetNow = (elementId, sliceId, field, opts) => fieldGapSheet(projectState(), elementId, sliceId, field, opts);
