// ===========================================
// PAD - What a made chapter was made from (SV: Pad Made Chapter)
// Make chapter records, with each frame it converts (PadFrameConverted), what it made from: every note inside the frame then (its colour
// and text), the sticky each command / view / event note became, the fields, and the hotspot and white-note lines it took.
// With that the Pad can tell the sketch has changed since (a note edited, recoloured, added to or taken out of the frame), and
// Update chapter can work out what to carry over. A frame converted before this was recorded has no snapshot: it is made, but
// nothing can be said about it changing.
// made: { notes: { noteId → { colour, text } }, stickies: [{ noteId, role, name, elementId }], fields: [name], extras: [{ noteId, role, text }],
//         screens: [{ noteId, name, text, implied, elementId }] (the screen placed in the slice, with the sketch it was given; implied: not from a note in the frame), off: [line key] }
// ===========================================

import { notesInFrame } from './sketch.js';

const STICKY_TYPE = { command: 'command', view: 'readModel', event: 'event' };
export const stickyTypeOf = role => STICKY_TYPE[role];
export const lower = s => String(s ?? '').trim().toLowerCase();

// The notes inside the frame now, as the snapshot keeps them
export const notesNow = (pad, frame) => Object.fromEntries(notesInFrame(pad, frame).map(n => [n.id, { colour: n.colour, text: n.text }]));

// Has anything in the frame changed since the chapter was made? (false when nothing was recorded)
export function changedSince(pad, frame) {
  if (!frame.made) return false;
  const was = frame.made.notes || {}, now = notesNow(pad, frame), ids = new Set([...Object.keys(was), ...Object.keys(now)]);
  return [...ids].some(id => !was[id] || !now[id] || was[id].colour !== now[id].colour || was[id].text !== now[id].text);
}

// The snapshot of a frame's slice (a preview slice of Pad Make Chapter), once the slice is on the board: sliceId is its slice there
export function madeOf(state, frame, slice, sliceId, off) {
  const lines = slice.lines.filter(l => l.included), board = (state.slices[sliceId]?.elements || []).map(id => state.elements[id]).filter(Boolean);
  const stickies = lines.filter(l => STICKY_TYPE[l.role]).map(l => ({
    noteId: l.noteId, role: l.role, name: l.name,
    elementId: board.find(el => el.type === STICKY_TYPE[l.role] && lower(el.name) === lower(l.name))?.id || null
  }));
  const fields = [...new Map(lines.filter(l => l.role === 'field').map(l => [lower(l.name), l.name])).values()];
  const extras = lines.filter(l => l.role === 'hotspot' || l.role === 'note').map(l => ({ noteId: l.noteId, role: l.role, text: l.text }));
  const screens = lines.filter(l => l.role === 'screen').map(l => ({ noteId: l.noteId, name: l.name, text: l.screenText, implied: !!l.implied, elementId: board.find(el => el.type === 'screen' && lower(el.name) === lower(l.name))?.id || null }));
  return { notes: notesNow(state.pad, frame), stickies, fields, extras, screens, off: [...off] };
}
