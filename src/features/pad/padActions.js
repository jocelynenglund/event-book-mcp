// ===========================================
// PAD - Toolbar actions (SV: Pad Toolbar, Pad Event Maker)
// What each [data-pad-action] button of the Pad does: the dispatcher the screen's click listener calls.
// ===========================================

import { openGuide } from './guideInput.js';
import { openPlaces } from './padPlaces.js';
import { strip as stripAction } from './scenarioStrip.js';
import { unlinkNotes, removeNotes } from './command.js';
import { NOTE_SIZE, SCREEN_WIDTH } from './sketch.js';
import { isChapterFolded, toggleChapterFolded } from '../board/view.js';
import { showBoard } from '../../ui/feed.js';
import { showToast } from '../../ui/toast.js';
import { canEditCurrent } from '../../core/eventStore.js';
import { S, $, store, GRID, MODE_KEY, clearSelection, wrote } from './padScreenState.js';
import { centre, stageBox, zoomAt, fit, drawBar, jumpToFrame } from './padViewport.js';
import { startNoteHere, addFrameHere, linkSelected, removeSelected, addExample, endEdit } from './noteEditing.js';
import { stretchArrow } from './arrowResize.js';
import { openMake, openUpdate, openBulk } from './padSheets.js';

export function onAction(a, t) {
  if (t.getAttribute('aria-disabled') === 'true') { showToast(t.title); return; }   // a greyed button says what to select
  if (a === 'add-note') { const c = centre(); startNoteHere(c.x, c.y); }
  else if (a === 'add-frame') addFrameHere();
  else if (a === 'link-copy') linkSelected(Math.max(NOTE_SIZE, ...S.scene.notes.filter(n => S.sel.noteIds.has(n.noteId) && n.colour === 'screen').map(() => SCREEN_WIDTH)) + GRID, 0);
  else if (a === 'unlink') wrote(unlinkNotes([...S.sel.noteIds]), 'Unlinked');
  else if (a === 'remove-selected') removeSelected();
  else if (a === 'remove-note') { clearSelection(); wrote(removeNotes([t.dataset.note]), 'Note removed'); }
  else if (a === 'add-many') openBulk();
  else if (a === 'make-chapter') openMake();
  else if (a === 'open-chapter') openChapter(t.dataset.chapter);
  else if (a === 'jump-maker') jumpToFrame(t.dataset.frame);
  else if (a === 'note-places') openPlaces(S.stateNow, t.dataset.note);
  else if (a === 'update-chapter') openUpdate(t.dataset.frame);
  else if (a === 'zoom-in' || a === 'zoom-out') { const r = stageBox(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, S.vp.k * (a === 'zoom-in' ? 1.25 : 0.8)); }
  else if (a === 'fit') fit();
  else if (a === 'open-guide') { endEdit(); openGuide(S.stateNow, canEditCurrent()); }
  else if (a === 'add-example') addExample(t.dataset.colour);
  else if (a === 'stretch-arrow') { const id = [...S.sel.noteIds][0]; wrote(stretchArrow(S.scene, id), null); }
  else if (a === 'more') { const slot = $('padToolbarSlot'); slot.dataset.more = slot.dataset.more === 'true' ? 'false' : 'true'; }   // phones: the rest of the toolbar (the slot outlives the redraws)
  else if (a === 'toggle-mode') { S.mode = S.mode === 'select' ? 'pan' : 'select'; store.set(MODE_KEY, S.mode); drawBar(); }
  else stripAction(a);
}

// A made frame's chip: straight to the board, with that chapter open
function openChapter(chapterId) {
  showBoard();
  if (isChapterFolded(chapterId)) toggleChapterFolded(chapterId);
}
