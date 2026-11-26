// ===========================================
// PAD - Note editing (SV: Pad Notes, Pad Frames, Pad Swatches, Pad Kind Card)
// Starting and ending the typing of a note or a frame's name, the writes that follow a tap (remove, frame, linked copy, the example
// note), the colour last used, and dragging a colour out of the strip.
// ===========================================

import { padKindCard as kindCardView } from './padKindCard.read.js';
import { addNote, editNote, recolourNotes, removeNotes, addFrame, changeFrame, removeFrames, groupNotes, linkNotes } from './command.js';
import { holdSwatch, hideKindCard } from './guideInput.js';
import { suggestShow, suggestClear } from './suggestInput.js';
import { NOTE_SIZE, ARROW_WIDTH, ARROW_HEIGHT } from './sketch.js';
import { newId } from '../board/command.js';
import { showToast } from '../../ui/toast.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { render } from '../../ui/feed.js';
import { canEditCurrent } from '../../core/eventStore.js';
import { S, $, store, COLOUR_KEY, clearSelection, only, redraw, wrote } from './padScreenState.js';
import { centre, stageBox, toWorld, drawBar } from './padViewport.js';

// A note being typed ends: a new one is recorded once (empty too: a blank note stays on the Pad; only Escape on a new empty one drops it),
// an old one when its text changed
export function endEdit({ cancel = false } = {}) {
  const ed = S.editing;
  if (!ed) return;
  suggestClear();
  const box = $('padWorld').querySelector(ed.kind === 'frame' ? '.pad-frame-input' : '.pad-note-input');
  const value = box ? box.value : ed.value ?? '';
  S.editing = null;
  if (ed.kind === 'frame') { wrote(changeFrame(ed.id, { name: value }), null); return; }
  if (S.draft && S.draft.noteId === ed.id) {
    const d = S.draft; S.draft = null;
    if (value.trim() || !cancel) { useColour(d.colour); wrote(addNote({ noteId: d.noteId, x: d.x, y: d.y, colour: d.colour, text: value }), null); } else render();
    return;
  }
  wrote(editNote(ed.id, value), null);
}

export function startNoteHere(x, y, at = S.colour) {
  if (!canEditCurrent()) { showToast('Read only: check the book out to sketch on the Pad'); return; }
  endEdit();
  const noteId = newId('pn');
  const [w, h] = at === 'arrow' ? [ARROW_WIDTH, ARROW_HEIGHT] : [NOTE_SIZE, NOTE_SIZE];   // an arrow is put down by its middle too
  S.draft = { noteId, x: Math.round(x - w / 2), y: Math.round(y - h / 2), colour: at };
  S.editing = { kind: 'note', id: noteId, value: '' };
  clearSelection();
  redraw();
}

export function startFrameName(frameId) {
  only('frame', frameId);
  S.editing = { kind: 'frame', id: frameId, value: null };
  render();
}

export function removeSelected() {
  const notes = [...S.sel.noteIds], frames = [...S.sel.frameIds];
  clearSelection();
  const refused = removeNotes(notes) || removeFrames(frames);
  wrote(refused, frames.length && !notes.length ? 'Frame removed (its notes stay)' : 'Removed');
}

// ▭ Frame: round the selected notes, or an empty one in the middle; then it asks for its name
export function addFrameHere() {
  if (!canEditCurrent()) return;
  endEdit();
  const c = centre(), frameId = newId('pf');
  const refused = S.sel.noteIds.size ? groupNotes([...S.sel.noteIds], { frameId }) : addFrame({ frameId, x: c.x - 320, y: c.y - 210, w: 640, h: 420, name: '' });
  if (refused) return;
  startFrameName(frameId);
}

// A linked copy of each selected note, (dx, dy) from it; the copies become the selection
export function linkSelected(dx, dy) {
  const copies = S.scene.notes.filter(n => S.sel.noteIds.has(n.noteId)).map(n => ({ noteId: newId('pn'), linkOf: n.noteId, x: n.x + dx, y: n.y + dy }));
  S.sel = { noteIds: new Set(copies.map(c => c.noteId)), frameIds: new Set() };
  wrote(linkNotes(copies), 'Linked copy placed');
}

// "Add this example" (on the kind card or in the guide): the kind's example note, in the middle of what is in view, selected; one undo takes it back
export function addExample(colourOf) {
  const example = kindCardView(S.stateNow, { colour: colourOf })?.example;
  if (!example) return;
  const c = centre(), noteId = newId('pn');
  hideKindCard();
  hideAllSheets();
  S.sel = { noteIds: new Set([noteId]), frameIds: new Set() };
  wrote(addNote({ noteId, x: Math.round(c.x - NOTE_SIZE / 2), y: Math.round(c.y - NOTE_SIZE / 2), colour: colourOf, text: example.text }), 'Added the example');
}

export const useColour = c => { S.colour = c; store.set(COLOUR_KEY, c); };

// Dragging a colour out of the strip: a ghost note follows the pointer; let go over the canvas for a new note
export function onSwatchDown(e) {
  const s = e.target.closest('[data-pad-swatch]');
  if (!s || e.button > 0) return;
  const at = s.dataset.padSwatch, start = { x: e.clientX, y: e.clientY };
  let ghost = null;
  const hold = e.pointerType === 'touch' ? holdSwatch(s, () => S.stateNow, canEditCurrent) : null;   // a held finger shows the kind card instead
  const move = ev => {
    if (hold && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6) hold.cancel();
    if (!ghost && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6) {
      ghost = document.createElement('div');
      ghost.className = 'pad-note pad-ghost';
      ghost.dataset.colour = at;
      document.body.appendChild(ghost);
      document.body.style.cursor = 'grabbing';
    }
    if (ghost) {
      const arrow = at === 'arrow', size = NOTE_SIZE * S.vp.k, w = arrow ? ARROW_WIDTH * S.vp.k : size, h = arrow ? ARROW_HEIGHT * S.vp.k : size;
      Object.assign(ghost.style, { left: `${ev.clientX - w / 2}px`, top: `${ev.clientY - h / 2}px`, width: `${w}px`, height: `${h}px` });
    }
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
    if (S.draft && S.editing?.id === S.draft.noteId) { S.draft.colour = at; redraw(); }                       // the note being typed turns that colour
    else if (S.editing?.kind === 'note') { const id = S.editing.id; endEdit(); wrote(recolourNotes([id], at), null); }
    else if (S.sel.noteIds.size) wrote(recolourNotes([...S.sel.noteIds], at), null);
    else drawBar();
  };
  document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  e.preventDefault();
}

// The names offered for the note being typed (its colour: the draft's, or the note's)
export function suggestNote(box, typed = true) {
  if (S.editing?.kind !== 'note') return;
  const draftNow = S.draft?.noteId === S.editing.id ? S.draft : null, colourNow = draftNow ? draftNow.colour : S.scene.notes.find(n => n.noteId === S.editing.id)?.colour;
  suggestShow({ box, mount: $('padSuggestSlot'), getState: () => S.stateNow, colour: colourNow, noteId: S.editing.id, at: draftNow ? { x: draftNow.x, y: draftNow.y } : null, typed });
}
