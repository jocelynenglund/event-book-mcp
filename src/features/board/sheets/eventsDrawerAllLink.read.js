// BOARD SHEETS - Events Drawer All Link (SV): from a view's Given list (read only), the way to the full, editable list of
// the events it reads. null anywhere else (the full list itself, or a drawer that is not checked out here).
export function eventsDrawerAllLink(book, sliceId, { readOnly = false, givens = false } = {}) {
  if (!book.slices[sliceId] || !givens || readOnly) return null;
  return { sliceId, label: 'All events it reads' };
}
