// ===========================================
// PAD - Screen (SV: Pad Notes, Pad Frames, Pad Toolbar, Pad Swatches, Pad Hint, Pad Event Maker, Pad Make Chapter, Pad Update Chapter, Pad Bulk Form, Pad Bulk Preview)
// The Pad (Jocelyn: "a way to free style it like miro, just simple notes … then group into slices … convert it to a chapter on the
// active board"): a dotted canvas of plain sticky notes, framed into sketched slices, then Make chapter… builds them onto the board.
// Drag empty space to draw a selection rectangle (middle or Space + drag, the wheel, or two fingers pan; a finger pans, or selects after a
// hold; ▭ Select / ✋ Pan in the toolbar says what a plain drag does), ctrl+wheel (or pinch) to zoom. Double-click (double-tap) the canvas for a note and type;
// drag a colour from the strip for one; tap a note to select it, drag to move it (on a touch screen, a short hold first, so a drag of
// the canvas pans), shift-click or shift-drag a lasso for several. A frame is moved by its top edge, resized by its corner, named by
// tapping its label; with notes selected, Frame draws it round them. 🔗 Link copy (or Alt-drag a note) makes a linked copy: the same
// note in another place. ＋ Events opens a sheet to paste a list into, one event (orange note) per line, laid out as a grid in the middle of the view. Every write is the book's own command (pad/command.js, pad/makeChapter.command.js); where the viewer is, what is
// selected, the note being typed and the colour last used are this device's, not events.
// The screen composes the parts and reads no state itself: feed.js hands it the one replay of the book per draw.
// ===========================================

import { updateSaveChip } from '../sync/view.js';
import { padNotes } from './padNotes.read.js';
import { padFrames } from './padFrames.read.js';
import { padToolbar as toolbarView } from './padToolbar.read.js';
import { padSwatches as swatchesView } from './padSwatches.read.js';
import { padEventMaker as makerView } from './padEventMaker.read.js';
import { padHint as hintView } from './padHint.read.js';
import { padMakeChapter as makeView } from './padMakeChapter.read.js';
import { padUpdateChapter as updateView } from './padUpdateChapter.read.js';
import { padBulkForm as bulkFormView } from './padBulkForm.read.js';
import { padBulkPreview as bulkPreviewView } from './padBulkPreview.read.js';
import { padNote, padFrame, padToolbar, padSwatches, padEventMaker, padHint, padMakeChapter, padUpdateChapter, padBulkForm, padBulkPreview } from './pad.parts.js';
import { addNote, addNotes, editNote, recolourNotes, removeNotes, addFrame, changeFrame, removeFrames, groupNotes, linkNotes, unlinkNotes, dragBy } from './command.js';
import { padKindCard as kindCardView } from './padKindCard.read.js';
import { initGuide, openGuide, holdSwatch, hideKindCard } from './guideInput.js';
import { suggestShow, suggestClear, suggestKey, initSuggest } from './suggestInput.js';
import { makeChapter } from './makeChapter.command.js';
import { initClipboard } from './clipboard.js';
import { openPlaces, initPlaces, flashNote } from './padPlaces.js';
import { strip as stripAction, initScenarioStrip, barHtml } from './scenarioStrip.js';
import { updateChapter } from './updateChapter.command.js';
import { NOTE_SIZE, SCREEN_WIDTH, COLOURS } from './sketch.js';
import { newId } from '../board/command.js';
import { isChapterFolded, toggleChapterFolded } from '../board/view.js';
import { openBoardSheet } from '../board/sheets/shared.js';
import { toastWithUndo, undo } from '../undo/command.js';
import { showToast } from '../../ui/toast.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { draftGet, draftClear, showDraftHint } from '../../ui/sheetDraft.js';
import { render, showBoard } from '../../ui/feed.js';
import { canEditCurrent, getCurrentModelId } from '../../core/eventStore.js';

const MIN_ZOOM = 0.2, MAX_ZOOM = 2.5, GRID = 24;
const HOLD_MS = 220, AREA_HOLD_MS = 350, MOVE_PX = 6, DOUBLE_MS = 380;   // a press becomes a drag only after MOVE_PX of movement: a real hand wiggles a pixel or two in a click
const VIEW_KEY = id => `eventbook_pad_view:${id}`, COLOUR_KEY = 'eventbook_pad_colour', MODE_KEY = 'eventbook_pad_mode';

const store = {
  get: key => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: just this time */ } }
};

// This device's: where the viewer is, what is selected, the note or frame name being typed, the colour last used
let bookNow = null;                                  // the model the state below is about
let vp = { x: 40, y: 60, k: 1 };                      // the canvas's offset and zoom
let fitted = false;                                   // the viewer was placed (stored, or fitted once) for this book
let sel = { noteIds: new Set(), frameIds: new Set() };
let editing = null;                                   // { kind: 'note' | 'frame', id, value }
let draft = null;                                     // a note being typed that is not recorded yet { noteId, x, y, colour }
let colour = COLOURS.includes(store.get(COLOUR_KEY)) ? store.get(COLOUR_KEY) : 'blue';
let stateNow = null, scene = { notes: [], frames: [] };
let makeUi = null;                                    // Make chapter… is open: { frameIds, chapterName, names, off }
let updateUi = null;                                  // Update chapter is open: { frameId }
let mode = ['select', 'pan'].includes(store.get(MODE_KEY)) ? store.get(MODE_KEY) : (window.matchMedia?.('(pointer: coarse)').matches ? 'pan' : 'select');   // what a plain drag on empty canvas does on this device
let spaceDown = false;                                // Space is held: a drag pans
let bulkUi = null;                                    // ＋ Events is open: { text }

// What is selected on the Pad now (for the picture of the Pad: shareImage/sheet.js)
export const padSelectionNow = () => ({ noteIds: [...sel.noteIds], frameIds: [...sel.frameIds] });

const $ = id => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- drawing ----------

function shell(container) {
  if (container.querySelector('.pad-stage')) return;
  container.innerHTML = `
    <div class="pad-bar"><div id="padToolbarSlot"></div><div id="padSwatchSlot"></div><div id="padMakerSlot"></div><div id="padStripSlot"></div></div>
    <div class="pad-stage" id="padStage"><div class="pad-world" id="padWorld"></div><div id="padHintSlot"></div></div>
    <div class="pad-suggest-slot" id="padSuggestSlot" hidden></div>`;
}

// Draws the Pad into #padView, from the book feed.js replayed for this draw
export function renderPad(state) {
  updateSaveChip();   // the ☁ chip in the top bar: Save to library, Saved, Saving…, Not saved
  const container = $('padView');
  if (!container) return;
  if (bookNow !== getCurrentModelId()) { bookNow = getCurrentModelId(); sel = { noteIds: new Set(), frameIds: new Set() }; editing = null; draft = null; makeUi = null; updateUi = null; fitted = false; }
  stateNow = state;
  suggestClear();
  shell(container);
  const editable = canEditCurrent();
  const noteEdit = editing?.kind === 'note' ? editing : null, frameEdit = editing?.kind === 'frame' ? editing : null;
  const notes = padNotes(state, { draft, editable, selectedIds: [...sel.noteIds], editing: noteEdit }), frames = padFrames(state, { editable, selectedIds: [...sel.frameIds], editing: frameEdit });
  scene = { notes: notes.notes, frames: frames.frames };
  // What is selected is only what is still there
  sel.noteIds.forEach(id => scene.notes.some(n => n.noteId === id) || sel.noteIds.delete(id));
  sel.frameIds.forEach(id => scene.frames.some(f => f.frameId === id) || sel.frameIds.delete(id));
  if (editing && !(editing.kind === 'note' ? scene.notes : scene.frames).some(x => (x.noteId || x.frameId) === editing.id)) editing = null;
  if (!fitted) { fitted = true; const saved = store.get(VIEW_KEY(bookNow)); if (saved) vp = saved; else fit(false); }

  $('padWorld').innerHTML = scene.frames.map(padFrame).join('') + scene.notes.map(padNote).join('');
  drawBar();
  const hint = hintView(state, { editable, draft });
  $('padHintSlot').innerHTML = hint ? padHint(hint) : '';
  applyView(false);
  const box = editing && (editing.kind === 'frame' ? $('padWorld').querySelector('.pad-frame-input') : $('padWorld').querySelector('.pad-note-input'));
  if (box) { box.focus(); box.setSelectionRange?.(box.value.length, box.value.length); }
}

// The toolbar and swatches again (the selection or the zoom changed)
function drawBar() {
  const editable = canEditCurrent();
  $('padToolbarSlot').innerHTML = padToolbar(toolbarView(stateNow, { zoom: vp.k, selection: { noteIds: [...sel.noteIds], frameIds: [...sel.frameIds] }, editable, mode }));
  $('padStage').dataset.mode = mode;
  const swatches = swatchesView(stateNow, { colour, editable, selection: { noteIds: [...sel.noteIds] } });
  $('padSwatchSlot').innerHTML = swatches ? padSwatches(swatches) : '';
  $('padMakerSlot').innerHTML = padEventMaker(makerView(stateNow, { selectedIds: [...sel.noteIds] }));
  $('padStripSlot').innerHTML = barHtml(stateNow, [...sel.noteIds], editable);
}

// Only the selection changed: draw again from the same book
const redraw = () => renderPad(stateNow);

// Where the viewer is: the world's transform, the dots behind it, and the device's memory of it
function applyView(save = true) {
  const stage = $('padStage');
  $('padWorld').style.transform = `translate(${vp.x}px, ${vp.y}px) scale(${vp.k})`;
  stage.style.setProperty('--pad-grid', `${GRID * vp.k}px`);
  stage.style.setProperty('--pad-ox', `${vp.x}px`);
  stage.style.setProperty('--pad-oy', `${vp.y}px`);
  if (save) store.set(VIEW_KEY(bookNow), vp);
}

const stageBox = () => $('padStage').getBoundingClientRect();
const toWorld = (cx, cy) => { const r = stageBox(); return { x: (cx - r.left - vp.x) / vp.k, y: (cy - r.top - vp.y) / vp.k }; };

function zoomAt(cx, cy, k) {
  const r = stageBox(), next = clamp(k, MIN_ZOOM, MAX_ZOOM), px = cx - r.left, py = cy - r.top;
  vp = { x: px - (px - vp.x) * (next / vp.k), y: py - (py - vp.y) * (next / vp.k), k: next };
  applyView();
  drawBar();
}

// The boxes (in world units) in view: the canvas pans and zooms (never closer than 100%) so they fit; nothing: the start
function fit(draw = true, boxes = [...scene.notes.map(n => ({ x: n.x, y: n.y, w: NOTE_SIZE, h: NOTE_SIZE })), ...scene.frames.map(f => ({ x: f.x, y: f.y, w: f.w, h: f.h }))]) {
  const r = $('padStage')?.getBoundingClientRect(), W = r?.width || window.innerWidth, H = r?.height || window.innerHeight - 120;
  if (!boxes.length) vp = { x: 40, y: 60, k: 1 };
  else {
    const x0 = Math.min(...boxes.map(b => b.x)), y0 = Math.min(...boxes.map(b => b.y));
    const w = Math.max(...boxes.map(b => b.x + b.w)) - x0, h = Math.max(...boxes.map(b => b.y + b.h)) - y0;
    const k = clamp(Math.min((W - 80) / w, (H - 80) / h, 1), MIN_ZOOM, 1);
    vp = { k, x: (W - w * k) / 2 - x0 * k, y: (H - h * k) / 2 - y0 * k };
  }
  if (draw) { applyView(); drawBar(); }
}

// "Made by <Command> ↗": that frame comes into view and is the selection
function jumpToFrame(frameId) {
  const f = scene.frames.find(x => x.frameId === frameId);
  if (!f) return;
  only('frame', frameId);
  fit(false, [{ x: f.x, y: f.y, w: f.w, h: f.h }]);
  applyView();
  redraw();
}

// A place in the 🔗 list: that note comes into view (never closer than 100%), is the selection, and flashes
function jumpToNote(noteId) {
  const n = scene.notes.find(x => x.noteId === noteId);
  if (!n) { showToast('That note is gone'); return; }
  only('note', noteId);
  fit(false, [{ x: n.x, y: n.y, w: NOTE_SIZE, h: NOTE_SIZE }]);
  applyView();
  redraw();
  flashNote(noteId);
}

// ---------- the selection ----------

const only = (kind, id) => { sel = { noteIds: new Set(kind === 'note' ? [id] : []), frameIds: new Set(kind === 'frame' ? [id] : []) }; };
const toggle = (kind, id) => { const s = kind === 'note' ? sel.noteIds : sel.frameIds; s.has(id) ? s.delete(id) : s.add(id); };
const isSelected = (kind, id) => (kind === 'note' ? sel.noteIds : sel.frameIds).has(id);
const clearSelection = () => { sel = { noteIds: new Set(), frameIds: new Set() }; };

// ---------- writing ----------

function wrote(refused, message) {
  render();
  if (refused) showToast(refused);
  else if (message) toastWithUndo(message);
  return !refused;
}

// A note being typed ends: a new one is recorded once (empty too: a blank note stays on the Pad; only Escape on a new empty one drops it),
// an old one when its text changed
function endEdit({ cancel = false } = {}) {
  const ed = editing;
  if (!ed) return;
  suggestClear();
  const box = $('padWorld').querySelector(ed.kind === 'frame' ? '.pad-frame-input' : '.pad-note-input');
  const value = box ? box.value : ed.value ?? '';
  editing = null;
  if (ed.kind === 'frame') { wrote(changeFrame(ed.id, { name: value }), null); return; }
  if (draft && draft.noteId === ed.id) {
    const d = draft; draft = null;
    if (value.trim() || !cancel) { useColour(d.colour); wrote(addNote({ noteId: d.noteId, x: d.x, y: d.y, colour: d.colour, text: value }), null); } else render();
    return;
  }
  wrote(editNote(ed.id, value), null);
}

function startNoteHere(x, y, at = colour) {
  if (!canEditCurrent()) { showToast('Read only: check the book out to sketch on the Pad'); return; }
  endEdit();
  const noteId = newId('pn');
  draft = { noteId, x: Math.round(x - NOTE_SIZE / 2), y: Math.round(y - NOTE_SIZE / 2), colour: at };
  editing = { kind: 'note', id: noteId, value: '' };
  clearSelection();
  redraw();
}

const centre = () => { const r = stageBox(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); };

function startFrameName(frameId) {
  only('frame', frameId);
  editing = { kind: 'frame', id: frameId, value: null };
  render();
}

function removeSelected() {
  const notes = [...sel.noteIds], frames = [...sel.frameIds];
  clearSelection();
  const refused = removeNotes(notes) || removeFrames(frames);
  wrote(refused, frames.length && !notes.length ? 'Frame removed (its notes stay)' : 'Removed');
}

// ▭ Frame: round the selected notes, or an empty one in the middle; then it asks for its name
function addFrameHere() {
  if (!canEditCurrent()) return;
  endEdit();
  const c = centre(), frameId = newId('pf');
  const refused = sel.noteIds.size ? groupNotes([...sel.noteIds], { frameId }) : addFrame({ frameId, x: c.x - 320, y: c.y - 210, w: 640, h: 420, name: '' });
  if (refused) return;
  startFrameName(frameId);
}

// A linked copy of each selected note, (dx, dy) from it; the copies become the selection
function linkSelected(dx, dy) {
  const copies = scene.notes.filter(n => sel.noteIds.has(n.noteId)).map(n => ({ noteId: newId('pn'), linkOf: n.noteId, x: n.x + dx, y: n.y + dy }));
  sel = { noteIds: new Set(copies.map(c => c.noteId)), frameIds: new Set() };
  wrote(linkNotes(copies), 'Linked copy placed');
}

function onAction(a, t) {
  if (t.getAttribute('aria-disabled') === 'true') { showToast(t.title); return; }   // a greyed button says what to select
  if (a === 'add-note') { const c = centre(); startNoteHere(c.x, c.y); }
  else if (a === 'add-frame') addFrameHere();
  else if (a === 'link-copy') linkSelected(Math.max(NOTE_SIZE, ...scene.notes.filter(n => sel.noteIds.has(n.noteId) && n.colour === 'screen').map(() => SCREEN_WIDTH)) + GRID, 0);
  else if (a === 'unlink') wrote(unlinkNotes([...sel.noteIds]), 'Unlinked');
  else if (a === 'remove-selected') removeSelected();
  else if (a === 'remove-note') { clearSelection(); wrote(removeNotes([t.dataset.note]), 'Note removed'); }
  else if (a === 'add-many') openBulk();
  else if (a === 'make-chapter') openMake();
  else if (a === 'open-chapter') openChapter(t.dataset.chapter);
  else if (a === 'jump-maker') jumpToFrame(t.dataset.frame);
  else if (a === 'note-places') openPlaces(stateNow, t.dataset.note);
  else if (a === 'update-chapter') openUpdate(t.dataset.frame);
  else if (a === 'zoom-in' || a === 'zoom-out') { const r = stageBox(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, vp.k * (a === 'zoom-in' ? 1.25 : 0.8)); }
  else if (a === 'fit') fit();
  else if (a === 'open-guide') { endEdit(); openGuide(stateNow, canEditCurrent()); }
  else if (a === 'add-example') addExample(t.dataset.colour);
  else if (a === 'toggle-mode') { mode = mode === 'select' ? 'pan' : 'select'; store.set(MODE_KEY, mode); drawBar(); }
  else stripAction(a);
}

// "Add this example" (on the kind card or in the guide): the kind's example note, in the middle of what is in view, selected; one undo takes it back
function addExample(colourOf) {
  const example = kindCardView(stateNow, { colour: colourOf })?.example;
  if (!example) return;
  const c = centre(), noteId = newId('pn');
  hideKindCard();
  hideAllSheets();
  sel = { noteIds: new Set([noteId]), frameIds: new Set() };
  wrote(addNote({ noteId, x: Math.round(c.x - NOTE_SIZE / 2), y: Math.round(c.y - NOTE_SIZE / 2), colour: colourOf, text: example.text }), 'Added the example');
}

// ---------- Make chapter… ----------

function openMake() {
  endEdit();
  makeUi = { frameIds: [...sel.frameIds], chapterName: null, names: {}, off: [] };
  drawMake(true);
}

function drawMake(first = false) {
  openBoardSheet(padMakeChapter(makeView(stateNow, makeUi)), first ? 'padChapterName' : null);
}

function onMakeInput(e) {
  const t = e.target.closest?.('[data-pad-make]');
  if (!makeUi || !t) return;
  if (t.dataset.padMake === 'chapter') { makeUi.chapterName = t.value; document.querySelector('[data-pad-action="make-go"]').disabled = !t.value.trim(); }
  else makeUi.names[t.dataset.frame] = t.value;
}

function onMakeChange(e) {
  const t = e.target.closest?.('[data-pad-line]');
  if (!makeUi || !t) return;
  const key = t.dataset.padLine, off = new Set(makeUi.off);
  t.checked ? off.delete(key) : off.add(key);
  makeUi.off = [...off];
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

function openUpdate(frameId) {
  endEdit();
  updateUi = { frameId };
  openBoardSheet(padUpdateChapter(updateView(stateNow, updateUi)));
}

function update() {
  const { frameId } = updateUi, result = updateChapter({ frameId });
  if (result.refused) { showToast(result.refused); return; }
  updateUi = null;
  hideAllSheets();
  render();
  toastWithUndo(result.changes ? `Updated the chapter: ${result.changes} ${result.changes === 1 ? 'change' : 'changes'}` : 'Marked up to date');
}

function make() {
  const ui = makeUi, name = document.getElementById('padChapterName')?.value ?? ui.chapterName ?? '';
  const result = makeChapter({ frameIds: ui.frameIds, chapterName: name, names: ui.names, off: ui.off });
  if (result.refused) { showToast(result.refused); return; }
  makeUi = null;
  hideAllSheets();
  // Straight to the board, with the new chapter open
  showBoard();
  if (isChapterFolded(result.chapterId)) toggleChapterFolded(result.chapterId);
  toastWithUndo(`Made the chapter ${name.trim()}: ${result.slices} ${result.slices === 1 ? 'slice' : 'slices'}`);
}

// ---------- ＋ Events ----------

function openBulk() {
  endEdit();
  suggestClear();
  bulkUi = { text: draftGet('pad-bulk') };
  drawBulk();
  showDraftHint('padBulkText');
}

// The sheet (its box keeps what was typed), then what the list will add under it
function drawBulk() {
  openBoardSheet(padBulkForm(bulkFormView(stateNow, bulkUi)), 'padBulkText');
  showBulkPreview();
}

const bulkPreview = () => bulkPreviewView(stateNow, { ...bulkUi, at: centre() });
const showBulkPreview = () => { $('padBulkPreview').innerHTML = padBulkPreview(bulkPreview()); };

function onBulkInput(e) {
  if (!bulkUi || e.target.id !== 'padBulkText') return;
  bulkUi.text = e.target.value;
  showBulkPreview();
  suggestShow({ box: e.target, mount: $('padBulkSuggest'), getState: () => stateNow, colour: 'bulk' });
}

// Add n notes: all in one batch, all selected; the toast's Undo takes the whole batch back
function addMany() {
  const notes = bulkPreview().notes.map(n => ({ ...n, noteId: newId('pn') }));
  if (!notes.length) return;
  draftClear('pad-bulk');
  bulkUi = null;
  suggestClear();
  hideAllSheets();
  sel = { noteIds: new Set(notes.map(n => n.noteId)), frameIds: new Set() };
  wrote(addNotes(notes), `Added ${notes.length} ${notes.length === 1 ? 'event' : 'events'}`);
}

// ---------- gestures ----------

const pointers = new Map();     // pointerId → { x, y } of the fingers (or the mouse) down on the canvas
let gesture = null;             // what the pointer(s) down are doing
let lastTap = { at: 0, key: '' };

const target = e => {
  const el = e.target.closest?.('.pad-note, .pad-frame-head, .pad-frame-grip');
  if (!el) return { kind: 'empty' };
  if (el.matches('.pad-note')) return { kind: 'note', id: el.dataset.padNote, el };
  if (el.matches('.pad-frame-grip')) return { kind: 'resize', id: el.dataset.padFrameResize, el };
  return { kind: 'frame', id: el.dataset.padFrameHead, el, onName: !!e.target.closest('.pad-frame-name') };
};

// What a drag would move: the selected notes and frames, and the notes inside those frames
function movers() {
  const ids = new Set(sel.noteIds);
  scene.frames.filter(f => sel.frameIds.has(f.frameId)).forEach(f => f.noteIds.forEach(id => ids.add(id)));
  return [
    ...[...sel.frameIds].map(id => document.querySelector(`#padWorld [data-pad-frame="${id}"]`)),
    ...[...ids].map(id => document.querySelector(`#padWorld [data-pad-note="${id}"]`))
  ].filter(Boolean);
}

// What a drag lifts: the movers, or (Alt) a ghost of each selected note, left behind as a linked copy where it is dropped
function lift(g) {
  g.els = g.alt
    ? [...sel.noteIds].map(id => document.querySelector(`#padWorld [data-pad-note="${id}"]`)).filter(Boolean).map(el => { const ghost = el.cloneNode(true); el.after(ghost); return ghost; })
    : movers();
  g.els.forEach(el => el.classList.add('lifted'));
}

function onDown(e) {
  if (e.button > 1 || e.target.closest('button, textarea, input')) return;
  const stage = $('padStage');
  if (editing) endEdit();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  stage.setPointerCapture?.(e.pointerId);
  // A second finger: the canvas is being pinched, whatever the first one was doing
  if (pointers.size === 2) { cancelGesture(); const [a, b] = [...pointers.values()]; gesture = { type: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), vp: { ...vp }, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; return; }
  if (pointers.size > 2) return;
  // The middle button, or Space held: the canvas pans, whatever is under the pointer
  if (e.button === 1 || (spaceDown && e.pointerType !== 'touch')) { gesture = { id: e.pointerId, t: { kind: 'empty' }, sx: e.clientX, sy: e.clientY, moved: false, vp: { ...vp }, type: 'pan' }; return; }
  const t = target(e), touch = e.pointerType === 'touch', editable = canEditCurrent();
  const held = (t.kind === 'note' || t.kind === 'frame') && isSelected(t.kind, t.id);   // already selected (as after ＋ Many): a finger moves it at once
  gesture = { id: e.pointerId, t, touch, held, sx: e.clientX, sy: e.clientY, shift: e.shiftKey, alt: e.altKey && t.kind === 'note', moved: false, vp: { ...vp }, type: 'press', editable };
  if (t.kind === 'resize') { if (!editable) { gesture = null; return; } const f = scene.frames.find(x => x.frameId === t.id); gesture.type = 'resize'; gesture.f = f; return; }
  if (t.kind === 'note' || t.kind === 'frame') {
    // The thing pressed becomes the selection (unless it is already part of one, which a drag then moves whole)
    if (!e.shiftKey && !isSelected(t.kind, t.id)) { only(t.kind, t.id); redraw(); gesture.t.el = document.querySelector(t.kind === 'note' ? `#padWorld [data-pad-note="${t.id}"]` : `#padWorld [data-pad-frame-head="${t.id}"]`); }
    if (!editable) { gesture.type = 'pan'; return; }
    // A finger holds a moment before it lifts a note (until then it pans the canvas); a mouse lifts it at once
    if (touch) gesture.timer = setTimeout(() => { if (gesture && gesture.type === 'press') { gesture.type = 'drag'; lift(gesture); navigator.vibrate?.(8); } }, HOLD_MS);
    return;
  }
  // Empty canvas: a mouse draws a rectangle in Select mode (or with Shift), a finger in Select mode too, and in Pan mode after a hold; else it pans
  gesture.add = e.shiftKey || e.metaKey || e.ctrlKey;
  if (mode === 'select' || (e.shiftKey && !touch)) gesture.area = 'now';
  else if (touch) {
    gesture.area = 'hold';
    gesture.timer = setTimeout(() => { if (gesture && gesture.type === 'press' && !gesture.moved) { gesture.armed = true; $('padStage').dataset.hold = 'true'; } }, AREA_HOLD_MS);
  }
}

// The rectangle starts where the press was
function startArea(g) {
  clearTimeout(g.timer);
  const el = document.createElement('div');
  el.className = 'pad-lasso';
  $('padWorld').appendChild(el);
  Object.assign(g, { type: 'lasso', el, from: toWorld(g.sx, g.sy) });
  delete $('padStage').dataset.hold;
}

// What a rectangle between two world points covers: the notes and frames whose middle is inside
function covered(a, b) {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y), within = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  return {
    noteIds: scene.notes.filter(n => within(n.x + NOTE_SIZE / 2, n.y + NOTE_SIZE / 2)).map(n => n.noteId),
    frameIds: scene.frames.filter(f => within(f.x + f.w / 2, f.y + f.h / 2)).map(f => f.frameId)
  };
}

function cancelGesture() {
  if (!gesture) return;
  clearTimeout(gesture.timer);
  (gesture.els || []).forEach(el => { el.style.transform = ''; el.classList.remove('lifted'); });
  if (gesture.alt) (gesture.els || []).forEach(el => el.remove());
  gesture.el?.remove();
  delete $('padStage')?.dataset.hold;
  gesture = null;
}

function onMove(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const g = gesture;
  if (!g) return;
  if (g.type === 'pinch') {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const r = stageBox(), k = clamp(g.vp.k * d / g.d, MIN_ZOOM, MAX_ZOOM);
    const px = g.mid.x - r.left, py = g.mid.y - r.top;
    vp = { k, x: mid.x - r.left - (px - g.vp.x) * (k / g.vp.k), y: mid.y - r.top - (py - g.vp.y) * (k / g.vp.k) };
    applyView(false);
    return;
  }
  if (e.pointerId !== g.id) return;
  const dx = e.clientX - g.sx, dy = e.clientY - g.sy, far = Math.hypot(dx, dy) > MOVE_PX;
  if (far) g.moved = true;
  if (g.type === 'press' && far) {
    // On a touch screen a finger that moves before the hold is up is panning (unless the note is already selected); a mouse on a note or frame drags it
    if (g.t.kind === 'empty') { if (g.area === 'now' || (g.area === 'hold' && g.armed)) startArea(g); else { clearTimeout(g.timer); g.type = 'pan'; } }
    else if (g.touch && !(g.held && g.editable)) { clearTimeout(g.timer); g.type = 'pan'; }
    else if (g.editable) { g.type = 'drag'; lift(g); }
    else g.type = 'pan';
  }
  if (g.type === 'pan') { vp = { ...g.vp, x: g.vp.x + dx, y: g.vp.y + dy }; applyView(false); }
  else if (g.type === 'drag') g.els.forEach(el => { el.style.transform = `translate(${dx / vp.k}px, ${dy / vp.k}px)`; });
  else if (g.type === 'resize') { const f = $('padWorld').querySelector(`[data-pad-frame="${g.t.id}"]`); f.style.width = `${Math.max(220, g.f.w + dx / vp.k)}px`; f.style.height = `${Math.max(220, g.f.h + dy / vp.k)}px`; }
  else if (g.type === 'lasso') {
    const a = g.from, b = toWorld(e.clientX, e.clientY);
    Object.assign(g.el.style, { left: `${Math.min(a.x, b.x)}px`, top: `${Math.min(a.y, b.y)}px`, width: `${Math.abs(a.x - b.x)}px`, height: `${Math.abs(a.y - b.y)}px`, fontSize: `${13 / vp.k}px` });
    g.el.textContent = toolbarView(stateNow, { selection: covered(a, b) }).selected;   // "3 notes, 1 frame", live
  }
}

function onUp(e) {
  const had = pointers.delete(e.pointerId);
  const g = gesture;
  if (!had || !g) return;
  if (g.type === 'pinch') { if (pointers.size < 2) { gesture = null; applyView(); drawBar(); } return; }
  if (e.pointerId !== g.id) return;
  clearTimeout(g.timer);
  delete $('padStage').dataset.hold;
  gesture = null;
  const dx = (e.clientX - g.sx) / vp.k, dy = (e.clientY - g.sy) / vp.k;
  if (g.type === 'pan') { applyView(); return; }
  if (g.type === 'drag' && g.moved) {
    g.els.forEach(el => { el.style.transform = ''; el.classList.remove('lifted'); });
    if (g.alt) { g.els.forEach(el => el.remove()); linkSelected(Math.round(dx), Math.round(dy)); return; }
    wrote(dragBy({ noteIds: [...sel.noteIds], frameIds: [...sel.frameIds] }, Math.round(dx), Math.round(dy)), null);
    return;
  }
  if (g.type === 'resize' && g.moved) { wrote(changeFrame(g.t.id, { w: g.f.w + dx, h: g.f.h + dy }), null); return; }
  if (g.type === 'lasso') {
    const hit = covered(g.from, toWorld(e.clientX, e.clientY));
    g.el.remove();
    if (!g.add) clearSelection();
    hit.noteIds.forEach(id => sel.noteIds.add(id));
    hit.frameIds.forEach(id => sel.frameIds.add(id));
    redraw();
    return;
  }
  g.els?.forEach(el => el.classList.remove('lifted'));
  if (g.alt) g.els?.forEach(el => el.remove());
  tap(g, e);
}

// A tap that moved nothing: select, rename, edit, or (twice, on the canvas) make a note
function tap(g, e) {
  const { t } = g, key = `${t.kind}:${t.id || ''}`, now = Date.now(), twice = lastTap.key === key && now - lastTap.at < DOUBLE_MS;
  lastTap = twice ? { at: 0, key: '' } : { at: now, key };
  if (t.kind === 'empty') {
    if (twice && g.editable) { const p = toWorld(e.clientX, e.clientY); startNoteHere(p.x, p.y); return; }
    if (sel.noteIds.size || sel.frameIds.size) { clearSelection(); redraw(); }
    return;
  }
  if (t.kind === 'note') {
    if (g.shift) toggle('note', t.id); else only('note', t.id);
    if (twice && g.editable && !g.shift) { editing = { kind: 'note', id: t.id, value: null }; }
    redraw();
    return;
  }
  if (t.kind === 'frame') {
    if (g.shift) toggle('frame', t.id); else only('frame', t.id);
    if (g.editable && !g.shift && t.onName) editing = { kind: 'frame', id: t.id, value: null };
    redraw();
  }
}

function onWheel(e) {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, vp.k * Math.exp(-e.deltaY * 0.01));
  else { vp = { ...vp, x: vp.x - e.deltaX, y: vp.y - e.deltaY }; applyView(); }
}

const useColour = c => { colour = c; store.set(COLOUR_KEY, c); };

// Dragging a colour out of the strip: a ghost note follows the pointer; let go over the canvas for a new note
function onSwatchDown(e) {
  const s = e.target.closest('[data-pad-swatch]');
  if (!s || e.button > 0) return;
  const at = s.dataset.padSwatch, start = { x: e.clientX, y: e.clientY };
  let ghost = null;
  const hold = e.pointerType === 'touch' ? holdSwatch(s, () => stateNow, canEditCurrent) : null;   // a held finger shows the kind card instead
  const move = ev => {
    if (hold && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6) hold.cancel();
    if (!ghost && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6) { ghost = document.createElement('div'); ghost.className = 'pad-note pad-ghost'; ghost.dataset.colour = at; document.body.appendChild(ghost); document.body.style.cursor = 'grabbing'; }
    if (ghost) Object.assign(ghost.style, { left: `${ev.clientX - NOTE_SIZE * vp.k / 2}px`, top: `${ev.clientY - NOTE_SIZE * vp.k / 2}px`, width: `${NOTE_SIZE * vp.k}px`, height: `${NOTE_SIZE * vp.k}px` });
  };
  const up = ev => {
    document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
    ghost?.remove(); document.body.style.cursor = '';
    hold?.cancel();
    if (hold?.held()) return;
    if (ghost) {
      const r = stageBox();
      if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom) { const p = toWorld(ev.clientX, ev.clientY); startNoteHere(p.x, p.y, at); }
      return;
    }
    // A tap: colour the selected notes, or choose the colour of the next one
    useColour(at);
    if (draft && editing?.id === draft.noteId) { draft.colour = at; redraw(); }                       // the note being typed turns that colour
    else if (editing?.kind === 'note') { const id = editing.id; endEdit(); wrote(recolourNotes([id], at), null); }
    else if (sel.noteIds.size) wrote(recolourNotes([...sel.noteIds], at), null);
    else drawBar();
  };
  document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  e.preventDefault();
}

// The names offered for the note being typed (its colour: the draft's, or the note's)
function suggestNote(box, typed = true) {
  if (editing?.kind !== 'note') return;
  const draftNow = draft?.noteId === editing.id ? draft : null, colourNow = draftNow ? draftNow.colour : scene.notes.find(n => n.noteId === editing.id)?.colour;
  suggestShow({ box, mount: $('padSuggestSlot'), getState: () => stateNow, colour: colourNow, noteId: editing.id, at: draftNow ? { x: draftNow.x, y: draftNow.y } : null, typed });
}

function onKey(e) {
  if (e.target.id === 'padBulkText' && suggestKey(e)) return;
  if (!document.getElementById('padView')?.offsetParent) return;
  const typing = e.target.matches?.('[data-pad-input]');
  if (typing) {
    if (e.target.matches('textarea') && suggestKey(e)) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endEdit({ cancel: true }); }
    else if (e.key === 'Enter' && (e.target.matches('input') || e.ctrlKey || e.metaKey)) { e.preventDefault(); endEdit(); }
    return;
  }
  if (e.target.closest?.('input, textarea, select, .sheet-overlay.active')) return;
  // Ctrl/Cmd+Z takes back the last action (a removed frame included), as ↶ Undo in the menu does; typing keeps its own undo
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (e.code === 'Space') { e.preventDefault(); spaceDown = true; $('padStage').dataset.space = 'true'; return; }   // hold Space and drag to pan
  if ((e.key === 'Delete' || e.key === 'Backspace') && (sel.noteIds.size || sel.frameIds.size)) { e.preventDefault(); removeSelected(); }
  else if (e.key === 'Escape' && (sel.noteIds.size || sel.frameIds.size)) { clearSelection(); redraw(); }
}

export function initPad() {
  const view = $('padView');
  if (!view) return;
  view.addEventListener('click', e => { const t = e.target.closest('[data-pad-action]'); if (t) onAction(t.dataset.padAction, t); });
  view.addEventListener('pointerdown', e => { if (e.target.closest('#padStage')) onDown(e); else onSwatchDown(e); });
  view.addEventListener('pointermove', onMove);
  view.addEventListener('pointerup', onUp);
  view.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); cancelGesture(); });
  view.addEventListener('wheel', e => { if (e.target.closest('#padStage')) onWheel(e); }, { passive: false });
  view.addEventListener('input', e => { if (editing && e.target.matches?.('[data-pad-input]')) { editing.value = e.target.value; if (e.target.matches('textarea')) suggestNote(e.target); } });
  view.addEventListener('keyup', e => { if (editing && e.target.matches?.('textarea[data-pad-input]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) suggestNote(e.target, false); });
  initSuggest();
  initPlaces(jumpToNote);
  view.addEventListener('focusout', e => { if (editing && e.target.matches?.('[data-pad-input]')) setTimeout(() => { if (editing && !document.querySelector('#padView [data-pad-input]:focus')) endEdit(); }, 0); });
  document.addEventListener('keydown', onKey);
  initGuide(() => stateNow, canEditCurrent);
  initScenarioStrip({ state: () => stateNow, selected: () => [...sel.noteIds], select: ids => { sel = { noteIds: new Set(ids), frameIds: new Set() }; }, wrote });
  initClipboard({ state: () => stateNow, selection: padSelectionNow, select: ({ noteIds, frameIds }) => { sel = { noteIds: new Set(noteIds), frameIds: new Set(frameIds) }; }, toWorld, centre, wrote, active: () => !!$('padView')?.offsetParent });
  const spaceUp = e => { if (!spaceDown || (e.type === 'keyup' && e.code !== 'Space')) return; if (e.type === 'keyup') e.preventDefault(); spaceDown = false; delete $('padStage')?.dataset.space; };
  document.addEventListener('keyup', spaceUp);
  window.addEventListener('blur', spaceUp);
  view.addEventListener('mousedown', e => { if (e.button === 1 && e.target.closest('#padStage')) e.preventDefault(); });   // no browser auto-scroll on the middle button
  // The Make chapter… sheet lives in the board sheet, outside the Pad
  document.addEventListener('input', onMakeInput);
  document.addEventListener('change', onMakeChange);
  document.addEventListener('input', onBulkInput);
  document.addEventListener('click', e => {
    const t = bulkUi && e.target.closest('#boardSheetContent [data-pad-action="bulk-add"]');
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
    if (!t || !(makeUi || updateUi)) return;
    const a = t.dataset.padAction;
    if (a === 'make-cancel') { makeUi = null; hideAllSheets(); }
    else if (a === 'make-go' && makeUi) make();
    else if (a === 'update-cancel') { updateUi = null; hideAllSheets(); }
    else if (a === 'update-go' && updateUi) update();
  });
  window.addEventListener('resize', () => { if (view.offsetParent) applyView(false); });
}
