// ===========================================
// PAD - Commands
// SC: Add Pad Note, Add Many Pad Notes, Move Pad Notes, Edit Pad Note, Recolour Pad Notes, Remove Pad Notes, Add Pad Frame, Change Pad Frame,
//     Remove Pad Frames, Paste Pad Items, Group Pad Notes (Frame round the selection), Link Pad Note, Unlink Pad Notes, and Drag Pad (notes and frames moved together, with the notes inside the frames).
// Each returns null when it recorded what it should (or there was nothing to change), else why it was refused. One action is one
// batch, so one undo takes it all back. A drag is one move per note, written on drop, never while it is under the finger.
// ===========================================

import { appendEvent, EventTypes, canEditCurrent } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { newId } from '../board/command.js';
import { COLOURS, FRAME_MIN, notesInFrame, frameAround, originalId, placesOf } from './sketch.js';

const READ_ONLY = 'Read only: check the book out to sketch on the Pad';
const pad = () => projectState().pad;
const round = v => Math.round(Number(v) || 0);

// Records each [type, data] in turn; a refused write (the book can not be changed here) says why
const record = events => (events.every(([type, data]) => appendEvent(type, data)) ? null : READ_ONLY);

const BAD_COLOUR = 'Notes are blue, orange, green, red, white, scenario, screen or automation';
const goodColour = ({ colour = 'blue' }) => COLOURS.includes(colour);
const noteAdded = ({ noteId = newId('pn'), x, y, colour = 'blue', text = '' }) =>
  [EventTypes.PadNoteAdded, { noteId, x: round(x), y: round(y), colour, text: String(text).replace(/\r\n?/g, '\n') }];

export function addNote(note) {
  if (!canEditCurrent()) return READ_ONLY;
  return goodColour(note) ? record([noteAdded(note)]) : BAD_COLOUR;
}

// ＋ Many: each of notes ([{ noteId?, x, y, colour, text }]) added as above, all in one action
export function addNotes(notes) {
  if (!canEditCurrent()) return READ_ONLY;
  return notes.every(goodColour) ? record(notes.map(noteAdded)) : BAD_COLOUR;
}

// Paste: frames ([{ frameId?, x, y, w, h, name }]) and notes (as ＋ Many) added as new ones, together in one action (one undo)
export function pasteItems({ frames = [], notes = [] }) {
  if (!canEditCurrent()) return READ_ONLY;
  if (!notes.every(goodColour)) return BAD_COLOUR;
  const frameAdded = ({ frameId = newId('pf'), x, y, w, h, name = '' }) =>
    [EventTypes.PadFrameAdded, { frameId, x: round(x), y: round(y), w: Math.max(FRAME_MIN, round(w)), h: Math.max(FRAME_MIN, round(h)), name: String(name).trim() }];
  return record([...frames.map(frameAdded), ...notes.map(noteAdded)]);
}

// moves: [{ noteId, x, y }]; the ones that stay where they are, and notes that are gone, are skipped
export function moveNotes(moves) {
  if (!canEditCurrent()) return READ_ONLY;
  const { notes } = pad();
  return record(moves.filter(m => notes[m.noteId] && (notes[m.noteId].x !== round(m.x) || notes[m.noteId].y !== round(m.y)))
    .map(m => [EventTypes.PadNoteMoved, { noteId: m.noteId, x: round(m.x), y: round(m.y) }]));
}

export function editNote(noteId, text) {
  if (!canEditCurrent()) return READ_ONLY;
  const note = pad().notes[noteId], next = String(text).replace(/\r\n?/g, '\n');
  return !note || note.text === next ? null : record([[EventTypes.PadNoteEdited, { noteId: originalId(pad(), noteId), text: next }]]);
}

export function recolourNotes(noteIds, colour) {
  if (!canEditCurrent()) return READ_ONLY;
  if (!COLOURS.includes(colour)) return 'Notes are blue, orange or green';
  const { notes } = pad();
  // A linked note changes colour once, on its original, however many of its places were chosen
  const originals = new Set(noteIds.filter(id => notes[id] && notes[id].colour !== colour).map(id => originalId(pad(), id)));
  return record([...originals].map(noteId => [EventTypes.PadNoteRecoloured, { noteId, colour }]));
}

// copies: [{ noteId?, linkOf, x, y }]: each a linked copy of the note linkOf (a copy of a copy is a copy of the original); the
// ones whose note is gone are skipped
export function linkNotes(copies) {
  if (!canEditCurrent()) return READ_ONLY;
  const { notes } = pad();
  return record(copies.filter(c => notes[c.linkOf]).map(c => [EventTypes.PadNoteLinked, { noteId: c.noteId || newId('pn'), linkOf: originalId(pad(), c.linkOf), x: round(c.x), y: round(c.y) }]));
}

// Each becomes a note of its own with the text it has now; the ones that are not linked are skipped
export function unlinkNotes(noteIds) {
  if (!canEditCurrent()) return READ_ONLY;
  return record(noteIds.filter(id => pad().notes[id] && placesOf(pad(), id).length > 1).map(noteId => [EventTypes.PadNoteUnlinked, { noteId }]));
}

export function removeNotes(noteIds) {
  if (!canEditCurrent()) return READ_ONLY;
  const { notes } = pad();
  return record(noteIds.filter(id => notes[id]).map(noteId => [EventTypes.PadNoteRemoved, { noteId }]));
}

export function addFrame({ frameId = newId('pf'), x, y, w, h, name = '' }) {
  if (!canEditCurrent()) return READ_ONLY;
  return record([[EventTypes.PadFrameAdded, { frameId, x: round(x), y: round(y), w: Math.max(FRAME_MIN, round(w)), h: Math.max(FRAME_MIN, round(h)), name: String(name).trim() }]]);
}

// changes: any of { x, y, w, h, name }; only what differs is recorded
export function changeFrame(frameId, changes) {
  if (!canEditCurrent()) return READ_ONLY;
  const frame = pad().frames[frameId];
  if (!frame) return null;
  const next = { ...changes };
  for (const k of ['x', 'y', 'w', 'h']) if (k in next) next[k] = k === 'w' || k === 'h' ? Math.max(FRAME_MIN, round(next[k])) : round(next[k]);
  if ('name' in next) next.name = String(next.name).trim();
  const diff = Object.fromEntries(Object.entries(next).filter(([k, v]) => frame[k] !== v));
  return Object.keys(diff).length ? record([[EventTypes.PadFrameChanged, { frameId, ...diff }]]) : null;
}

// Its notes stay where they are
export function removeFrames(frameIds) {
  if (!canEditCurrent()) return READ_ONLY;
  const { frames } = pad();
  return record(frameIds.filter(id => frames[id]).map(frameId => [EventTypes.PadFrameRemoved, { frameId }]));
}

// A frame round the notes (a margin, and room above for its name)
export function groupNotes(noteIds, { frameId = newId('pf'), name = '' } = {}) {
  if (!canEditCurrent()) return READ_ONLY;
  const { notes } = pad();
  const chosen = noteIds.map(id => notes[id]).filter(Boolean);
  if (!chosen.length) return 'Select some notes to group';
  return record([[EventTypes.PadFrameAdded, { frameId, ...frameAround(chosen), name }]]);
}

// What a drag lets go of: the selected notes and frames, moved by (dx, dy), and with each frame the notes inside it. Each
// thing moves once, however it was selected.
export function dragBy({ noteIds = [], frameIds = [] }, dx, dy) {
  if (!canEditCurrent()) return READ_ONLY;
  const sketch = pad();
  const frames = frameIds.map(id => sketch.frames[id]).filter(Boolean);
  const ids = new Set(noteIds.filter(id => sketch.notes[id]));
  frames.forEach(f => notesInFrame(sketch, f).forEach(n => ids.add(n.id)));
  const moves = [...ids].map(id => ({ noteId: id, x: sketch.notes[id].x + dx, y: sketch.notes[id].y + dy }));
  return record([
    ...frames.filter(f => dx || dy).map(f => [EventTypes.PadFrameChanged, { frameId: f.id, x: round(f.x + dx), y: round(f.y + dy) }]),
    ...moves.filter(m => dx || dy).map(m => [EventTypes.PadNoteMoved, { noteId: m.noteId, x: round(m.x), y: round(m.y) }])
  ]);
}
