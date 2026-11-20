// ===========================================
// OUTLINE - Part heading (SV: Outline Part Heading)
// What a part's heading over its chapters draws: its name, and how many chapters and slices it holds. null when the
// part is gone.
// ===========================================

import { chapterParts } from '../arrange/chapterParts.read.js';

export function outlinePartHeading(state, partId) {
  const group = chapterParts(state).find(g => g.partId === partId);
  if (!group) return null;
  const n = group.chapterIds.length;
  return { partId, name: group.part, chapters: n, slices: group.slices,
    counts: `${n} ${n === 1 ? 'chapter' : 'chapters'} · ${group.slices} ${group.slices === 1 ? 'slice' : 'slices'}` };
}
