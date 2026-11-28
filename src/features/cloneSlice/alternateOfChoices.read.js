// CLONE SLICE - Alternate Of Choices (SV)
// What the "Alternate of…" sheet asks: which slice of the chapter this alternate stands in for. The options are the chapter's slices that are no
// alternates themselves (the main line: its happy slices) and not this slice, in the book's order; "None" is always there. null when the slice is gone.
// -> { sliceId, title, current: the slice it points at now | null, options: [{ id, ref, title }] }
import { projectState, sliceRef, sliceTitle } from '../../core/projections.js';

export function alternateOfChoices(book, sliceId) {
  const slice = book.slices[sliceId];
  if (!slice) return null;
  const options = book.sliceOrder.map(id => book.slices[id])
    .filter(s => s && s.id !== sliceId && !s.alternateOf && (s.chapterId || null) === (slice.chapterId || null))
    .map(s => ({ id: s.id, ref: sliceRef(book, s.id), title: sliceTitle(s, book) }));
  return { sliceId, title: sliceTitle(slice, book), current: slice.alternateOf || null, options };
}

// The same, for the book as it stands (the sheet reads nothing of the book itself)
export const alternateOfChoicesNow = sliceId => alternateOfChoices(projectState(), sliceId);
