// ===========================================
// ARRANGE - Part Menu Fields (SV: Part Menu Fields)
// What a part's menu holds: its name (to rename) and what removing it does. null when the part is gone.
// ===========================================

import { projectState } from '../../core/projections.js';
import { chapterParts } from './chapterParts.read.js';

export function partMenuFields(state, partId) {
  const groups = chapterParts(state);
  const at = groups.findIndex(g => g.partId === partId);
  if (at < 0) return null;
  const group = groups[at], before = groups[at - 1];
  return { partId, name: group.part, chapters: group.chapterIds.length,
    removeNote: `Its chapters stay and join ${before?.partId ? `the part ${before.part}` : 'no part'}` };
}

// The part's menu as the open book has it, for the sheet that opens (it holds no book of its own)
export const partMenuNow = partId => partMenuFields(projectState(), partId);
