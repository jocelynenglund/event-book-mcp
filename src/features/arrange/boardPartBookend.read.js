// ===========================================
// ARRANGE - Board Part Bookend (SV: Board Part Bookend)
// A part's bookend on the shelf: its name, how many chapters and slices it holds, and whether it is folded into the
// bookend (a device setting, handed in as a question). null when the part is gone.
// ===========================================

import { chapterParts } from './chapterParts.read.js';

export function boardPartBookend(state, partId, { folded = () => false } = {}) {
  const group = chapterParts(state).find(g => g.partId === partId);
  if (!group) return null;
  const { chapterIds, slices, part: name } = group;
  return { partId, name, chapters: chapterIds.length, slices, folded: !!folded(partId),
    counts: `${chapterIds.length} ch · ${slices} ${slices === 1 ? 'slice' : 'slices'}` };
}
