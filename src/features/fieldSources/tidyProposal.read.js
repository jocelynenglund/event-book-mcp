// ===========================================
// FIELD SOURCES - Tidy Proposal (SV)
// What tidying a sticky's fields would do, before it does it: each field written as prose, as typed and as it would be
// ("pages[] (pageId, finishedAt)" → "pages[]{pageId, finishedAt}"), with a note on what cannot be kept.
// null when the sticky has nothing to tidy. canApply: not on a book that can't be changed here.
// ===========================================

import { projectState } from '../../core/projections.js';
import { tidyOf, afterText, noteOf } from './tidy.js';

export function tidyProposal(state, elementId, { readOnly = false } = {}) {
  const el = state.elements[elementId];
  const groups = el && tidyOf(el);
  if (!groups) return null;
  return { elementId, sticky: el.name, canApply: !readOnly, rows: groups.map(g => ({ before: g.before, after: afterText(g), note: noteOf(g) })) };
}

// The same, read from the book as it is now
export const tidyProposalNow = (elementId, opts) => tidyProposal(projectState(), elementId, opts);
