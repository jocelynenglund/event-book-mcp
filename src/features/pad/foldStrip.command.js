// ===========================================
// PAD - Folded strips
// SC: Fold Pad Strip — a scenario note made from a strip of example notes (Make scenario) holds those notes: they are not drawn, the note shows ▸ N.
// SC: Unfold Pad Strip — they are drawn again, each in its own place (▾ N); folding again takes the same ones.
// Make scenario can fold the strip as it makes the note (scenarioStrip.command.js). Each is one batch, so one undo takes it back.
// Each returns null when it recorded what it should (or there was nothing to change), else why it was refused.
// ===========================================

import { EventTypes, canEditCurrent } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { READ_ONLY, record } from './command.js';

export const NO_STRIP = 'This scenario note holds no example notes to fold';

// The events that draw the strip of this scenario note again (none when it is not folded)
export const unfoldEvents = (pad, noteId) => (pad.notes[noteId]?.strip?.open === false ? [[EventTypes.PadStripUnfolded, { noteId }]] : []);

// What folding the note's strip records: noteIds the first time (the ones given), later the strip it already has
export const foldEvents = (pad, noteId, noteIds = null) => {
  const strip = pad.notes[noteId]?.strip;
  return strip && !noteIds ? (strip.open ? [[EventTypes.PadStripFolded, { noteId }]] : []) : [[EventTypes.PadStripFolded, { noteId, noteIds }]];
};

export function foldStrip(noteId) {
  if (!canEditCurrent()) return READ_ONLY;
  const { pad } = projectState();
  if (!pad.notes[noteId]) return null;
  return pad.notes[noteId].strip ? record(foldEvents(pad, noteId)) : NO_STRIP;
}

export function unfoldStrip(noteId) {
  if (!canEditCurrent()) return READ_ONLY;
  const { pad } = projectState();
  return record(unfoldEvents(pad, noteId));
}
