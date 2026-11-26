// ===========================================
// BOARD - Stop reading an event here (✕ in a slice's events drawer)
// ===========================================
// Takes the event out of this slice only. In no other slice it is deleted like any sticky (deleteElement); one Undo either way.
// Refused while this slice's scenarios use it: the scenarios are the place to let go of it.

import { projectState } from '../../core/projections.js';
import { removeFromSlice } from './command.js';
import { deleteElement } from '../deleteElement/command.js';
import { toastWithUndo } from '../undo/command.js';
import { showToast } from '../../ui/toast.js';
import { render } from '../../ui/feed.js';
import { scenariosUsingEvent } from './sheets/sliceEventsDrawer.read.js';

export function stopReadingHere(sliceId, elementId) {
  const book = projectState();
  const el = book.elements[elementId];
  if (!el || !book.slices[sliceId]) return;
  const n = scenariosUsingEvent(sliceId, elementId, book);
  if (n) { showToast(`Used in ${n} ${n === 1 ? 'scenario' : 'scenarios'} here: remove it from them first`); return; }
  const elsewhere = Object.values(book.slices).some(s => s.id !== sliceId && !s.id.startsWith('au_inferred_') && s.elements.includes(elementId));
  if (elsewhere) { removeFromSlice(sliceId, elementId); render(); toastWithUndo(`${el.name} is no longer read here`); }
  else deleteElement(elementId);   // its own toast with Undo
}
