// ===========================================
// PAD - Copy, cut and paste on the screen (SV: Pad Clipboard Copy, Pad Paste Plan, Pad Paste Text)
// The Pad's wiring for Ctrl/Cmd+C, X and V, kept out of view.js. It uses the browser's copy, cut and paste events (no permission prompt):
// copy writes the notes' text as text/plain and the structured copy as CLIPBOARD_MIME, and keeps one in memory for when the browser drops
// the custom type; paste reads the structured copy (from this book, another book or tab) or else plain text. While a note, a frame name
// or any input is being typed in, the events do their normal text thing. Planning is padClipboard.rules.js; every write is a
// command (command.js: pasteItems, removeNotes, removeFrames), one action, so one undo.
// view.js hands it { state(), selection(), select({ noteIds, frameIds }), toWorld(x, y), centre(), wrote(refused, message), active() }.
// ===========================================

import { copyOf, textOf, payloadOf, pastePlan, textPlan, CLIPBOARD_MIME, PASTE_STEP } from './padClipboard.rules.js';
import { pasteItems, removeNotes, removeFrames } from './command.js';
import { notesInFrame } from './sketch.js';
import { newId } from '../board/command.js';
import { canEditCurrent } from '../../core/eventStore.js';

let host = null;
let memory = null;            // the last copy made here: { copy, text }
let pointer = null;           // where the mouse last was over the canvas, in client pixels
let middleAt = -1e9;          // when the middle button last went down or up: on Linux it pastes the selection, which is not a Ctrl+V
let repeat = { at: '', n: 0 };// pastes in a row at the same spot or offset, so each lands a little further on

const READ_ONLY = 'Read only: check the book out to sketch on the Pad';
const ids = { note: () => newId('pn'), frame: () => newId('pf') };

// The events are ours only when the Pad shows and nothing is being typed in
function ours(e) {
  if (!host.active()) return false;
  const t = e.target;
  return !t?.closest?.('input, textarea, select, [contenteditable], [data-pad-input], .sheet-overlay.active');
}

const selected = () => { const { noteIds, frameIds } = host.selection(); return { noteIds, frameIds }; };

// Everything a copy or cut takes: the selected notes, and the notes inside the selected frames
function takenIds(selection) {
  const pad = host.state().pad, noteIds = new Set(selection.noteIds.filter(id => pad.notes[id]));
  selection.frameIds.map(id => pad.frames[id]).filter(Boolean).forEach(f => notesInFrame(pad, f, true).forEach(n => noteIds.add(n.id)));
  return { noteIds: [...noteIds], frameIds: selection.frameIds.filter(id => pad.frames[id]) };
}

function write(e, copy) {
  const text = textOf(copy);
  memory = { copy, text };
  repeat = { at: '', n: 0 };
  e.clipboardData.setData('text/plain', text);
  e.clipboardData.setData(CLIPBOARD_MIME, JSON.stringify(copy));
  e.preventDefault();
}

function onCopy(e, cut) {
  if (!ours(e) || !e.clipboardData) return;
  const copy = copyOf(host.state().pad, selected());
  if (!copy) return;
  if (cut && !canEditCurrent()) { host.wrote(READ_ONLY); e.preventDefault(); return; }
  write(e, copy);
  if (!cut) return;
  const taken = takenIds(selected());
  host.select({ noteIds: [], frameIds: [] });
  const refused = removeNotes(taken.noteIds) || removeFrames(taken.frameIds);
  host.wrote(refused, 'Cut (paste puts it back)');
}

// Where a paste goes: the pointer over the canvas (a little further for each paste in a row at the same spot), else the middle of the view
function spot() {
  const key = pointer ? `${pointer.x},${pointer.y}` : '';
  repeat = key && repeat.at === key ? { at: key, n: repeat.n + 1 } : { at: key, n: 0 };
  const w = pointer ? host.toWorld(pointer.x, pointer.y) : host.centre();
  return { x: w.x + PASTE_STEP * repeat.n, y: w.y + PASTE_STEP * repeat.n };
}

function onPaste(e) {
  if (!ours(e) || !e.clipboardData || performance.now() - middleAt < 800) return;
  const text = e.clipboardData.getData('text/plain');
  let copy = payloadOf(e.clipboardData.getData(CLIPBOARD_MIME));
  if (!copy && memory && text === memory.text) copy = memory.copy;   // the browser kept the text but not our type
  e.preventDefault();
  if (!canEditCurrent()) { host.wrote(READ_ONLY); return; }
  let plan;
  if (copy) {
    // No pointer to paste at: step from the originals, again for each paste after
    if (pointer) plan = pastePlan(copy, { at: spot(), ids });
    else { repeat = { at: '', n: repeat.n + 1 }; plan = pastePlan(copy, { step: repeat.n, ids }); }
  } else {
    if (!text.trim()) return;
    plan = { frames: [], notes: textPlan(text, { at: spot(), ids }) };
  }
  if (!plan.notes.length && !plan.frames.length) return;
  host.select({ noteIds: plan.notes.map(n => n.noteId), frameIds: plan.frames.map(f => f.frameId) });
  const count = plan.notes.length + plan.frames.length;
  host.wrote(pasteItems(plan), `Pasted ${count} ${count === 1 ? 'item' : 'items'}`);
}

export function initClipboard(hostApi) {
  host = hostApi;
  document.addEventListener('copy', e => onCopy(e, false));
  document.addEventListener('cut', e => onCopy(e, true));
  document.addEventListener('paste', onPaste);
  for (const type of ['pointerdown', 'pointerup', 'mouseup', 'auxclick']) document.addEventListener(type, e => { if (e.button === 1) middleAt = performance.now(); }, true);
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    if (e.target.closest?.('#padStage')) pointer = { x: e.clientX, y: e.clientY };
  });
}
