// ===========================================
// FIELD SOURCES - The sheets a ⚠ and a count open
// Tap a field's ⚠ (on the board, the slice page, the Outline's chips): why it has no source, the fix, and Set by
// the system…, which asks how and records it; Comes from… maps it to another sticky's field; Trace follows it through the book. A piece of a field written as prose opens the tidy sheet instead.
// Tap a count (a chapter's, a slice's): the fix list, every gap with its one-tap fixes (Add the field where it comes
// from, Draw the event in, Set by the system…, Remove it), and Copy for an agent. A fix is one undo-able step; the
// list draws again without it. No browser dialogs. A read-only book shows the why and the fix only.
// They read through Field Gap Sheet, Fix List and Tidy Proposal and draw from fieldGaps.parts.js / fixes.parts.js;
// here are the sheets' state and their taps.
// ===========================================

import { openBoardSheet, onEnter } from '../board/sheets/shared.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';
import { render, getView, getOverviewTab, showSliceOnBoard } from '../../ui/feed.js';
import { isChapterFolded, toggleChapterFolded } from '../board/view.js';
import { scrollToSlice } from '../board/sheets/shared.js';
import { openElementMenu } from '../elementMenu/sheet.js';
import { copyText } from '../../ui/clipboard.js';
import { isReadOnly } from '../readOnly/sheet.js';
import { toastWithUndo } from '../undo/command.js';
import { markFieldSetBySystem } from './command.js';
import { openFieldMapPicker } from '../fieldMapping/sheet.js';
import { startTrace } from '../fieldTrace/traceState.js';
import { applyFix } from './fixes.command.js';
import { fieldGapSheetNow } from './fieldGapSheet.read.js';
import { fixListNow, fixListTextNow } from './fixList.read.js';
import { tidyProposalNow } from './tidyProposal.read.js';
import { fieldGapSheetBody } from './fieldGaps.parts.js';
import { fixListSheetBody, tidySheetBody } from './fixes.parts.js';

// The fix list the sheet came from (a tap on a count): the sheets it opens come back to it
let listScope = null;

export function openFieldGapSheet(elementId, sliceId, field, { asking = false, how = '' } = {}) {
  const form = fieldGapSheetNow(elementId, sliceId, field, { readOnly: isReadOnly(), asking, how });
  if (!form) return;
  if (form.tidy) { openTidySheet(form.elementId); return; }
  openBoardSheet(fieldGapSheetBody(form), asking ? 'fgHow' : undefined);
  if (asking) onEnter('fgHow', () => setBySystem(elementId, field));
}

// scope: { sliceId } or { chapterId }; undefined draws the list again as it was opened
export function openFixListSheet(scope = listScope) {
  if (!scope) return;
  listScope = scope;
  openBoardSheet(fixListSheetBody(fixListNow(scope, { readOnly: isReadOnly() })));
}

export function openTidySheet(elementId) {
  const view = tidyProposalNow(elementId, { readOnly: isReadOnly() });
  if (view) openBoardSheet(tidySheetBody(view));
}

// A sheet that is done: back to the fix list it came from, or closed
function backOrClose() {
  if (listScope && fixListNow(listScope).total) openFixListSheet(); else { listScope = null; hideAllSheets(); }
}

function setBySystem(elementId, field) {
  const how = document.getElementById('fgHow')?.value || '';
  const why = markFieldSetBySystem({ elementId, field, how });
  if (why) { hideAllSheets(); showToast(why); return; }
  render();
  backOrClose();
  toastWithUndo(`${field}: set by the system`);
}

// One fix, one undo-able step
function applyOne(fix) {
  const why = applyFix(fix);
  if (why) { showToast(why); return; }
  render();
  backOrClose();
  toastWithUndo({ add: 'Field added', draw: 'Event drawn in', remove: 'Field removed', tidy: 'Fields tidied' }[fix.split('|')[0]] || 'Fixed');
}

// A slice or sticky named in the list: the sheet closes and the screen goes there. The Outline scrolls to the slice's row and flashes it
// (the Pad has no list, so it falls to the board, which is where a slice made from a frame lives); a sticky's editor then opens (read-only in a book that isn't checked out)
function goToSlice(sliceId, chapterId) {
  hideAllSheets();
  if (chapterId && isChapterFolded(chapterId)) { toggleChapterFolded(chapterId); render(); }
  if (getView() === 'details' && getOverviewTab() === 'outline') {
    const row = document.querySelector(`#outlineView [data-component="Outline row"][data-key="${sliceId}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.remove('ol-flash');
    void row.offsetWidth;
    row.classList.add('ol-flash');
    setTimeout(() => row.classList.remove('ol-flash'), 1400);
  } else if (getView() === 'board') scrollToSlice(sliceId);
  else showSliceOnBoard(sliceId);
}

function goToElement(elementId, sliceId, chapterId) {
  goToSlice(sliceId, chapterId);
  setTimeout(() => openElementMenu(elementId, sliceId), 350);
}

// Taps in the sheets (the board's sheet wiring asks each module in turn)
export function onSheetAction(a, t) {
  const { el, slice, field } = t.dataset;
  if (a === 'fg-ask') { openFieldGapSheet(el, slice, field, { asking: true }); return true; }
  if (a === 'fg-how') { const input = document.getElementById('fgHow'); if (input) { input.value = t.dataset.how; input.focus(); } return true; }
  if (a === 'fg-set') { setBySystem(el, field); return true; }
  if (a === 'fx-go-slice') { goToSlice(t.dataset.slice, t.dataset.chapter); return true; }
  if (a === 'fx-go-el') { goToElement(el, slice, t.dataset.chapter); return true; }
  if (a === 'fx-apply') { applyOne(t.dataset.fix); return true; }
  if (a === 'fx-system') { openFieldGapSheet(el, slice, field, { asking: true }); return true; }
  // Comes from… / Map from…: pick the field; a fix list comes back to itself when it is done
  if (a === 'fg-map' || a === 'fx-map') { openFieldMapPicker(el, field, { done: a === 'fx-map' ? backOrClose : null }); return true; }
  if (a === 'fg-trace') { hideAllSheets(); startTrace(el, field); return true; }
  if (a === 'fx-tidy-open') { openTidySheet(el); return true; }
  if (a === 'fx-copy') {
    copyText(fixListTextNow(listScope)).then(ok => showToast(ok ? 'Copied: paste it to an agent' : 'Could not copy'));
    return true;
  }
  return false;
}

// The Outline's and the board's counts
export function onCountTap(t) { listScope = t.dataset.slice ? { sliceId: t.dataset.slice } : { chapterId: t.dataset.chapter }; openFixListSheet(); }
// A ⚠ on a field: not part of any list
export function onFieldTap(el, slice, field) { listScope = null; openFieldGapSheet(el, slice, field); }
