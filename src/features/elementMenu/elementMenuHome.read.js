// ELEMENT MENU - Element Menu Home (SV): the slice a read model's or a command's ⋮ acts on: the slice the menu was opened in
// when it has the sticky, else the first view (read model) or change / automation (command) that does. With it, what the
// slice has: its screen (if any), the names of its events, and who drives its top lane (a screen or a processor).
// null for a sticky of another kind, one in no slice, or one that is gone.
import { getOrderedSlices, sliceTitle } from '../../core/projections.js';

export function elementMenuHome(book, elementId, sliceId = null) {
  const el = book.elements[elementId];
  const kind = { readModel: s => s.type === 'SV', command: s => s.type !== 'SV' }[el?.type];
  if (!kind) return null;
  const has = s => s && kind(s) && s.elements.includes(elementId) && !s.id.startsWith('au_inferred_');
  const slice = has(book.slices[sliceId]) ? book.slices[sliceId] : getOrderedSlices(book).find(has);
  if (!slice) return null;
  const inSlice = slice.elements.map(id => book.elements[id]).filter(Boolean);
  const screen = inSlice.find(e => e.type === 'screen');
  return {
    sliceId: slice.id, sliceName: sliceTitle(slice, book),
    screen: screen ? { id: screen.id, name: screen.name } : null,
    events: inSlice.filter(e => e.type === 'event').map(e => e.name),
    actor: slice.type === 'AU' || inSlice.some(e => e.type === 'processor') ? 'processor' : 'screen'
  };
}
