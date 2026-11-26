// ===========================================
// ARRANGE - Board Part Tab (SV: Board Part Tab)
// A part's divider tab on the shelf: its name, how many chapters and slices it holds, whether it is folded to a sliver
// (a device setting, handed in as a question), and the width its text needs (the part's area is never narrower).
// null when the part is gone.
// ===========================================

import { chapterParts } from './chapterParts.read.js';

// px: the tab's padding, the ‹ and its gap; one letter of the name (13px bold caps, spaced: wide ones such as M and W come to 13) and one of the counts (mono)
const FRAME = 28 + 22 + 8, NAME_LETTER = 13, COUNTS_LETTER = 6.6, COUNTS_GAP = 8;

export function boardPartTab(state, partId, { folded = () => false } = {}) {
  const group = chapterParts(state).find(g => g.partId === partId);
  if (!group) return null;
  const { chapterIds, slices, part: name } = group;
  const isFolded = !!folded(partId);
  const counts = `${chapterIds.length} ch · ${slices}`;
  const minWidth = Math.ceil(FRAME + name.length * NAME_LETTER + (isFolded ? 0 : COUNTS_GAP + counts.length * COUNTS_LETTER));
  return { partId, name, chapters: chapterIds.length, slices, folded: isFolded, counts, minWidth };
}
