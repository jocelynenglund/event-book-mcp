// ===========================================
// PAD - Shelf
// SC: Shelve Pad Chapters — a chapter's made frames (frames Make chapter built into it) go on the shelf together: the Pad draws neither them nor
//     their notes, which keeps a big Pad light. The notes stay on the Pad, in their frame, hidden (sketch.js), and the chapter stays on the board.
// SC: Shelve All Made Pad Frames — every made frame that is on the Pad (all chapters).
// SC: Unshelve Pad Frames — the frames are drawn again, where they were, with the rest of their chapter's shelved frames.
// SC: Reveal Pad Note / Reveal Pad Frame — a jump to something hidden (a place of a linked note, "Made by ↗") takes what hides it away first:
//     the shelf (the whole chapter), and the folded strip.
// Each is one batch, so one undo takes it back. Each returns null when it recorded what it should (or there was nothing to change), else why it was refused.
// ===========================================

import { EventTypes, canEditCurrent } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { READ_ONLY, record } from './command.js';
import { notesInFrame } from './sketch.js';
import { unfoldEvents } from './foldStrip.command.js';

export const NOT_MADE = 'Only a chapter made from frames can go on the shelf';

// Made: Make chapter built it into a chapter that is still on the board
const isMade = (state, f) => !!(f.chapterId && state.chapters[f.chapterId]);
const shelving = (pad, frame) => [EventTypes.PadFrameShelved, { frameId: frame.id, noteIds: notesInFrame(pad, frame).map(n => n.id) }];

// The shelved frames that come back with these: a chapter's frames go and return together (a frame without a chapter is alone)
const withChapterMates = (pad, frameIds) => {
  const frames = frameIds.map(id => pad.frames[id]).filter(Boolean), chapters = new Set(frames.map(f => f.chapterId).filter(Boolean));
  return Object.values(pad.frames).filter(f => f.shelved && (frames.includes(f) || (f.chapterId && chapters.has(f.chapterId))));
};

export function shelveChapters(chapterIds) {
  if (!canEditCurrent()) return READ_ONLY;
  const state = projectState(), frames = Object.values(state.pad.frames);
  if (chapterIds.some(id => !frames.some(f => f.chapterId === id && isMade(state, f)))) return NOT_MADE;
  return record(frames.filter(f => !f.shelved && chapterIds.includes(f.chapterId)).map(f => shelving(state.pad, f)));
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
  return record(withChapterMates(pad, frameIds).map(f => [EventTypes.PadFrameUnshelved, { frameId: f.id }]));
}

// What hides a note: its frame (and the chapter's others) on the shelf, and the strip it is folded into; null when nothing does
export function revealNote(noteId) {
  if (!canEditCurrent()) return READ_ONLY;
  const { pad } = projectState(), n = pad.notes[noteId];
  if (!n) return null;
  return record([...withChapterMates(pad, n.shelvedIn ? [n.shelvedIn] : []).map(f => [EventTypes.PadFrameUnshelved, { frameId: f.id }]), ...unfoldEvents(pad, n.foldedInto)]);
}

export function revealFrame(frameId) {
  return unshelveFrames([frameId]);
}
