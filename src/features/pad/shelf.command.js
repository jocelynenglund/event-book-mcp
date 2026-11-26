// ===========================================
// PAD - Shelf
// SC: Shelve Pad Frames — made frames (a frame Make chapter built into a chapter) go on the shelf: the Pad draws neither them nor their
//     notes, which keeps a big Pad light. The notes stay on the Pad, in their frame, hidden (sketch.js), and the chapter stays on the board.
// SC: Shelve All Made Pad Frames — every made frame that is on the Pad.
// SC: Unshelve Pad Frames — the frames are drawn again, where they were.
// SC: Reveal Pad Note / Reveal Pad Frame — a jump to something hidden (a place of a linked note, "Made by ↗") takes what hides it away first:
//     the shelf, and the folded strip.
// Each is one batch, so one undo takes it back. Each returns null when it recorded what it should (or there was nothing to change), else why it was refused.
// ===========================================

import { EventTypes, canEditCurrent } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { READ_ONLY, record } from './command.js';
import { notesInFrame } from './sketch.js';
import { unfoldEvents } from './foldStrip.command.js';

export const NOT_MADE = 'Only a frame made into a chapter can go on the shelf';

// Made: Make chapter built it into a chapter that is still on the board
const isMade = (state, f) => !!(f.chapterId && state.chapters[f.chapterId]);
const unshelved = (pad, frames) => frames.map(id => pad.frames[id]).filter(f => f && !f.shelved);
const shelving = (pad, frame) => [EventTypes.PadFrameShelved, { frameId: frame.id, noteIds: notesInFrame(pad, frame).map(n => n.id) }];

export function shelveFrames(frameIds) {
  if (!canEditCurrent()) return READ_ONLY;
  const state = projectState(), todo = unshelved(state.pad, frameIds);
  if (todo.some(f => !isMade(state, f))) return NOT_MADE;
  return record(todo.map(f => shelving(state.pad, f)));
}

// Every made frame on the Pad, in the order they are on the Pad
export function shelveAllMade() {
  if (!canEditCurrent()) return READ_ONLY;
  const state = projectState();
  return record(Object.values(state.pad.frames).filter(f => !f.shelved && isMade(state, f)).map(f => shelving(state.pad, f)));
}

export function unshelveFrames(frameIds) {
  if (!canEditCurrent()) return READ_ONLY;
  const { pad } = projectState();
  return record(frameIds.map(id => pad.frames[id]).filter(f => f?.shelved).map(f => [EventTypes.PadFrameUnshelved, { frameId: f.id }]));
}

// What hides a note: its frame on the shelf, and the strip it is folded into; null when nothing does
export function revealNote(noteId) {
  if (!canEditCurrent()) return READ_ONLY;
  const { pad } = projectState(), n = pad.notes[noteId];
  if (!n) return null;
  const frame = pad.frames[n.shelvedIn];
  return record([...(frame?.shelved ? [[EventTypes.PadFrameUnshelved, { frameId: frame.id }]] : []), ...unfoldEvents(pad, n.foldedInto)]);
}

export function revealFrame(frameId) {
  return unshelveFrames([frameId]);
}
