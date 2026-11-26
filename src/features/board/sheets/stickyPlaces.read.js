// BOARD SHEETS - Sticky Places (SV): where a reused sticky is: every live slice that has it (S-number and title, in board
// order), the one the list was opened from, and, for an event, the slice(s) whose command makes it. Two makers get a warning.
// Inferred automation slices are not counted (they hold a sticky only because it is wired to the processor).
// null when the sticky is gone.
import { sliceTitle, sliceRef, getOrderedSlices } from '../../../core/projections.js';

// The live slices that hold a sticky, in board order (the Board card counts them for its 🔗 N)
export const slicesHolding = (book, elementId) =>
  getOrderedSlices(book).filter(s => !s.id.startsWith('au_inferred_') && s.elements.includes(elementId));

export function stickyPlaces(book, elementId, fromSliceId) {
  const el = book.elements[elementId];
  if (!el) return null;
  const holding = slicesHolding(book, elementId);
  const isCommand = id => book.elements[id]?.type === 'command';
  const makes = s => el.type === 'event' && s.type !== 'SV' && s.elements.some(isCommand);
  const makers = holding.filter(makes);
  return {
    elementId, name: el.name, count: holding.length,
    warning: makers.length > 1 ? `⚠ made by ${makers.length} commands` : null,
    rows: holding.map(s => ({ sliceId: s.id, ref: sliceRef(book, s.id), title: sliceTitle(s, book), here: s.id === fromSliceId, made: makes(s) }))
  };
}
