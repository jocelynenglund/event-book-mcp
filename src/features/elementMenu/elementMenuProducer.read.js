// ELEMENT MENU - Element Menu Producer (SV): for an event, the command that produces it (the first change or automation
// slice that has both) and the slice it is in; null for an event nothing produces yet and for any other kind of sticky.
import { producerOf } from '../board/sheets/sliceEventsDrawer.read.js';

export function elementMenuProducer(book, elementId) {
  if (book.elements[elementId]?.type !== 'event') return null;
  const from = producerOf(elementId, book);
  return from ? { commandId: from.commandId, name: book.elements[from.commandId].name, sliceId: from.slice.id } : null;
}
