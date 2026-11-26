// ===========================================
// BOARD SHEETS - A slice's events: the board folds them into a pile, this
// drawer shows each one and adds another. Tapping an event goes to the command
// that produces it; ✎ edits it.
// ===========================================

import { projectState } from '../../../core/projections.js';
import { hideAllSheets } from '../../../ui/sheets.js';
import { draftGet, draftClear, showDraftHint } from '../../../ui/sheetDraft.js';
import { render, showElementOnBoard } from '../../../ui/feed.js';
import { showToast } from '../../../ui/toast.js';
import { undo } from '../../undo/command.js';
import { openElementMenu } from '../../elementMenu/sheet.js';
import { openCellSheet } from './cell.js';
import { openBoardSheet, flashSlice } from './shared.js';
import { liveSlice } from './sliceStillThere.read.js';
import { sliceEventsDrawer } from './sliceEventsDrawer.read.js';
import { eventsDrawerAllLink } from './eventsDrawerAllLink.read.js';
import { eventsDrawerBody } from './events.parts.js';
import { stickyPlaces } from './stickyPlaces.read.js';
import { stickyPlacesBody } from './stickyPlaces.parts.js';
import { severalEventsForm, severalEventsPreview } from './severalEvents.read.js';
import { severalEventsFormBody, severalEventsPreviewBody } from './severalEvents.parts.js';
import { addSeveralEvents } from '../addSeveralEvents.command.js';
import { stopReadingHere } from '../stopReading.command.js';
import { openElementReadSheet, isReadOnly } from '../../readOnly/sheet.js';

// One replay of the book per sheet opening, and one per keystroke in the several-events box
const bookNow = () => projectState();

// readOnly: not checked out here, so no ✎ and no + (an event nothing produces reads its sticky)
// givens: the events its scenarios start from (tap one: the command that produces it)
export function openEventsSheet(sliceId, { readOnly = false, givens = false } = {}) {
  const book = bookNow();
  const drawer = sliceEventsDrawer(book, sliceId, { readOnly, givens });
  if (drawer) openBoardSheet(eventsDrawerBody(drawer, eventsDrawerAllLink(book, sliceId, { readOnly, givens })));
}

// 🔗 N on a sticky: the slices it is in, from the one it was tapped in (readable when not checked out: it only jumps)
export function openPlacesSheet(elementId, fromSliceId) {
  const view = stickyPlaces(bookNow(), elementId, fromSliceId);
  if (view) openBoardSheet(stickyPlacesBody(view));
}

// ＋ Several…: a box of `EventName(field, field)` lines, each shown as what it will do before anything is added
export function openSeveralEventsSheet(sliceId) {
  if (isReadOnly()) return;
  const form = severalEventsForm(bookNow(), sliceId);
  if (!form) return;
  openBoardSheet(severalEventsFormBody(form), 'bdSeveralText');
  const box = document.getElementById('bdSeveralText');
  box.value = draftGet('several');
  showDraftHint('bdSeveralText');
  const show = () => { document.getElementById('bdSeveralPreview').innerHTML = severalEventsPreviewBody(severalEventsPreview(bookNow(), sliceId, box.value)); };
  box.oninput = show;
  show();
}

// Add n events: all in one batch; the drawer then shows them, and the toast's Undo takes the whole batch back
function addSeveral(sliceId) {
  const n = addSeveralEvents(sliceId, document.getElementById('bdSeveralText')?.value);
  if (!n) return;
  draftClear('several');
  render();
  openEventsSheet(sliceId);
  showToast(`Added ${n} ${n === 1 ? 'event' : 'events'}`, { action: 'Undo', onAction: () => { undo(); openEventsSheet(sliceId); } });
}

export function onSheetAction(a, t) {
  // The target's own sheet replaces the drawer (one sheet at a time, as event-go does): both sit at the same z-index and the
  // drawer comes later in the page, so opening the sticky's sheet while the drawer stayed open left it blurred behind it
  if (a === 'event-read') { hideAllSheets(); openElementReadSheet(t.dataset.el); return true; }
  if (a === 'event-edit') { hideAllSheets(); openElementMenu(t.dataset.el, t.dataset.slice); return true; }
  if (a === 'event-stop') { stopReadingHere(t.dataset.slice, t.dataset.el); openEventsSheet(t.dataset.slice); return true; }
  if (a === 'event-go') {
    hideAllSheets();
    setTimeout(() => showElementOnBoard(t.dataset.el, t.dataset.slice), 150);
    return true;
  }
  if (a === 'place-go') {
    hideAllSheets();
    if (!liveSlice(t.dataset.slice)) { showToast('That slice is gone'); return true; }
    setTimeout(() => { showElementOnBoard(t.dataset.el, t.dataset.slice); requestAnimationFrame(() => flashSlice(t.dataset.slice)); }, 150);
    return true;
  }
  if (a === 'event-all') { openEventsSheet(t.dataset.slice); return true; }
  if (a === 'event-add') { openCellSheet(t.dataset.slice, 'event'); return true; }
  if (a === 'event-several') { openSeveralEventsSheet(t.dataset.slice); return true; }
  if (a === 'several-add') { addSeveral(t.dataset.slice); return true; }
  return false;
}
