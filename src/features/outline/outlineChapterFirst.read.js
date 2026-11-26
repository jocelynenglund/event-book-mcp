// ===========================================
// OUTLINE - Chapter first (SV: Outline Chapter First)
// Whether a new book's Outline starts with ＋ Chapter: an editable fact book with no chapter and no slice yet, not
// while searching or showing one stage. Then the slice kinds that can be added without a chapter ride along as a small line.
// layout: the Outline Layout. editable: this device can change the book (not read-only, not a build book).
// ===========================================

import { addKindChoices } from './outlineAddForm.read.js';

export function outlineChapterFirst(state, layout, { editable = true } = {}) {
  const chapterFirst = !!editable && !layout.literature && !layout.hasChapters && !layout.sliceCount && !layout.filtering;
  return { chapterFirst, kinds: chapterFirst ? addKindChoices : [] };
}
