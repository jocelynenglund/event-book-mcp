// ===========================================
// OUTLINE - Can add chapter (SV: Outline Can Add Chapter)
// Whether ＋ Chapter ends the outline: not while searching, nor while one stage is shown in a book that has slices. layout: the Outline Layout.
// ===========================================

export function outlineCanAddChapter(state, layout) {
  return { canAddChapter: !layout.searching && (!layout.filtering || layout.sliceCount === 0) };
}
