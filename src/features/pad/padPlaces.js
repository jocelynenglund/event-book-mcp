// ===========================================
// PAD - The places of a linked note (wiring for Pad Note Places)
// A tap on a note's 🔗 N opens the list of its places in the board sheet (drawn by the Pad note places component from the Pad Note Places view);
// a ↗ in it closes the sheet and goes to that place (the Pad's own jump: view.js), where the note flashes for a moment (none under reduced motion).
// ===========================================

import { padNotePlaces as placesView } from './padNotePlaces.read.js';
import { padNotePlaces } from './pad.parts.js';
import { openBoardSheet } from '../board/sheets/shared.js';
import { hideAllSheets } from '../../ui/sheets.js';

export function openPlaces(state, noteId) {
  const view = placesView(state, { noteId });
  if (view) openBoardSheet(padNotePlaces(view));
}

// The sheet's ↗: go(noteId) pans, zooms and selects the note
export function initPlaces(go) {
  document.addEventListener('click', e => {
    const t = e.target.closest('#boardSheetContent .pad-places [data-pad-action="places-go"]');
    if (!t) return;
    hideAllSheets();
    go(t.dataset.note);
  });
}

// Outline the note for about a second (CSS .pad-note-flash); the outline just stays that long when motion is reduced
export function flashNote(noteId) {
  const el = document.querySelector(`[data-pad-note="${CSS.escape(noteId)}"]`);
  if (!el) return;
  el.classList.remove('pad-note-flash');
  void el.offsetWidth;   // restart the animation when it is flashed again
  el.classList.add('pad-note-flash');
  setTimeout(() => el.classList.remove('pad-note-flash'), 1100);
}
