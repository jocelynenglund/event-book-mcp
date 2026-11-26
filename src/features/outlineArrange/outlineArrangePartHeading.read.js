// ===========================================
// OUTLINE ARRANGE - Part heading (SV: Outline Arrange Part Heading)
// What a part's heading draws in Arrange mode: its name and how many chapters and slices it holds; editable when the
// book can be arranged (a grip to drag it, its name to rename, ✕ to remove it). null when the part is gone.
// ===========================================

import { chapterParts } from '../arrange/chapterParts.read.js';

export function outlineArrangePartHeading(state, partId, { arrangeable = true } = {}) {
  const group = chapterParts(state).find(g => g.partId === partId);
  if (!group) return null;
  const n = group.chapterIds.length;
  return { partId, name: group.part, editable: arrangeable,
    counts: `${n} ${n === 1 ? 'chapter' : 'chapters'} · ${group.slices} ${group.slices === 1 ? 'slice' : 'slices'}` };
}
