// ===========================================
// PAD - Sheets (SV: Pad Make Chapter, Pad Update Chapter, Pad Bulk Form, Pad Bulk Preview)
// The sheets the Pad opens in the board sheet: Make chapter…, Update chapter and ＋ Events, and the listeners that follow them there
// (the sheet lives outside the Pad, so these sit on the document).
// ===========================================

import { padMakeChapter as makeView } from './padMakeChapter.read.js';
import { padUpdateChapter as updateView } from './padUpdateChapter.read.js';
import { padBulkForm as bulkFormView } from './padBulkForm.read.js';
import { padBulkPreview as bulkPreviewView } from './padBulkPreview.read.js';
import { padMakeChapter, padUpdateChapter, padBulkForm, padBulkPreview } from './pad.parts.js';
import { addNotes } from './command.js';
import { suggestShow, suggestClear } from './suggestInput.js';
import { makeChapter } from './makeChapter.command.js';
import { updateChapter } from './updateChapter.command.js';
import { newId } from '../board/command.js';
import { isChapterFolded, toggleChapterFolded } from '../board/view.js';
import { openBoardSheet } from '../board/sheets/shared.js';
import { toastWithUndo } from '../undo/command.js';
import { showToast } from '../../ui/toast.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { draftGet, draftClear, showDraftHint } from '../../ui/sheetDraft.js';
import { render, showBoard } from '../../ui/feed.js';
import { S, $, wrote } from './padScreenState.js';
import { centre } from './padViewport.js';
import { addExample, endEdit } from './noteEditing.js';

// ---------- Make chapter… ----------

export function openMake() {
  endEdit();
  S.makeUi = { frameIds: [...S.sel.frameIds], chapterName: null, names: {}, off: [], shelve: true };
  drawMake(true);
}

function drawMake(first = false) {
  openBoardSheet(padMakeChapter(makeView(S.stateNow, S.makeUi)), first ? 'padChapterName' : null);
}

function onMakeInput(e) {
  const t = e.target.closest?.('[data-pad-make]');
  if (!S.makeUi || !t) return;
  if (t.dataset.padMake === 'chapter') { S.makeUi.chapterName = t.value; document.querySelector('[data-pad-action="make-go"]').disabled = !t.value.trim(); }
  else S.makeUi.names[t.dataset.frame] = t.value;
}

function onMakeChange(e) {
  if (S.makeUi && e.target.matches?.('[data-pad-make="shelve"]')) { S.makeUi.shelve = e.target.checked; return; }
  const t = e.target.closest?.('[data-pad-line]');
  if (!S.makeUi || !t) return;
  const key = t.dataset.padLine, off = new Set(S.makeUi.off);
  t.checked ? off.delete(key) : off.add(key);
  S.makeUi.off = [...off];
  // The names typed so far stay: they are read back from the boxes before it is drawn again
  document.querySelectorAll('[data-pad-make]').forEach(b => onMakeInput({ target: b }));
  drawMake();
}

// A made frame's chip: straight to the board, with that chapter open
function openChapter(chapterId) {
  showBoard();
  if (isChapterFolded(chapterId)) toggleChapterFolded(chapterId);
}

// ---------- Update chapter ----------

export function openUpdate(frameId) {
  endEdit();
  S.updateUi = { frameId };
  openBoardSheet(padUpdateChapter(updateView(S.stateNow, S.updateUi)));
}

function update() {
  const { frameId } = S.updateUi, result = updateChapter({ frameId });
  if (result.refused) { showToast(result.refused); return; }
  S.updateUi = null;
  hideAllSheets();
  render();
  toastWithUndo(result.changes ? `Updated the chapter: ${result.changes} ${result.changes === 1 ? 'change' : 'changes'}` : 'Marked up to date');
}

function make() {
  const ui = S.makeUi, name = document.getElementById('padChapterName')?.value ?? ui.chapterName ?? '';
  const result = makeChapter({ frameIds: ui.frameIds, chapterName: name, names: ui.names, off: ui.off, shelve: ui.shelve });
  if (result.refused) { showToast(result.refused); return; }
  S.makeUi = null;
  hideAllSheets();
  // Straight to the board, with the new chapter open
  showBoard();
  if (isChapterFolded(result.chapterId)) toggleChapterFolded(result.chapterId);
  toastWithUndo(`Made the chapter ${name.trim()}: ${result.slices} ${result.slices === 1 ? 'slice' : 'slices'}`);
}

// ---------- ＋ Events ----------

export function openBulk() {
  endEdit();
  suggestClear();
  S.bulkUi = { text: draftGet('pad-bulk') };
  drawBulk();
  showDraftHint('padBulkText');
}

// The sheet (its box keeps what was typed), then what the list will add under it
function drawBulk() {
  openBoardSheet(padBulkForm(bulkFormView(S.stateNow, S.bulkUi)), 'padBulkText');
  showBulkPreview();
}

const bulkPreview = () => bulkPreviewView(S.stateNow, { ...S.bulkUi, at: centre() });
const showBulkPreview = () => { $('padBulkPreview').innerHTML = padBulkPreview(bulkPreview()); };

function onBulkInput(e) {
  if (!S.bulkUi || e.target.id !== 'padBulkText') return;
  S.bulkUi.text = e.target.value;
  showBulkPreview();
  suggestShow({ box: e.target, mount: $('padBulkSuggest'), getState: () => S.stateNow, colour: 'bulk' });
}

// Add n notes: all in one batch, all selected; the toast's Undo takes the whole batch back
function addMany() {
  const notes = bulkPreview().notes.map(n => ({ ...n, noteId: newId('pn') }));
  if (!notes.length) return;
  draftClear('pad-bulk');
  S.bulkUi = null;
  suggestClear();
  hideAllSheets();
  S.sel = { noteIds: new Set(notes.map(n => n.noteId)), frameIds: new Set() };
  wrote(addNotes(notes), `Added ${notes.length} ${notes.length === 1 ? 'event' : 'events'}`);
}

// The sheets' listeners: they sit on the document, the board sheet is outside the Pad
export function initPadSheets() {
  document.addEventListener('input', onMakeInput);
  document.addEventListener('change', onMakeChange);
  document.addEventListener('input', onBulkInput);
  document.addEventListener('click', e => {
    const t = S.bulkUi && e.target.closest('#boardSheetContent [data-pad-action="bulk-add"]');
    if (!t) return;
    addMany();
  });
  document.addEventListener('click', e => {   // the guide's sheet
    const t = e.target.closest('#boardSheetContent .pad-guide [data-pad-action]');
    if (t?.dataset.padAction === 'add-example') addExample(t.dataset.colour);
    else if (t?.dataset.padAction === 'guide-close') hideAllSheets();
  });
  document.addEventListener('click', e => {
    const t = e.target.closest('#boardSheetContent [data-pad-action]');
    if (!t || !(S.makeUi || S.updateUi)) return;
    const a = t.dataset.padAction;
    if (a === 'make-cancel') { S.makeUi = null; hideAllSheets(); }
    else if (a === 'make-go' && S.makeUi) make();
    else if (a === 'update-cancel') { S.updateUi = null; hideAllSheets(); }
    else if (a === 'update-go' && S.updateUi) update();
  });
}
