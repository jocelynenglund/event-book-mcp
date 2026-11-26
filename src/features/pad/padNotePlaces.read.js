// ===========================================
// PAD - Note Places (SV: Pad Note Places)
// The list a linked note's 🔗 N mark opens: one row per place of the note (the original and its copies, oldest first): the frame it sits in
// (its shown name: own, else its command's or view's title) or "loose", `here` for the place the list was opened from, `original` for the original,
// and for an event `made` when that place's frame holds a command that makes it (never for an external event, another system's).
// null when the note is gone or is in one place only.
// A place that is not drawn says why: `hidden` is 'shelf' (its frame is on the shelf) or 'folded' (it is folded into a scenario note); its ↗ shows it again.
// -> { noteId, name, count, rows: [{ noteId, where, frameId, here, original, made, hidden }] }
// ===========================================

import { placesOf, originalId, notesInFrame, KIND_OF } from './sketch.js';
import { titleAndBody } from './padNotes.read.js';
import { padFrames } from './padFrames.read.js';
import { parseNote } from './padNote.rules.js';

export function padNotePlaces(state, { noteId } = {}) {
  const pad = state.pad || { notes: {}, frames: {} };
  if (!pad.notes[noteId]) return null;
  const places = placesOf(pad, noteId);
  if (places.length < 2) return null;
  const root = originalId(pad, noteId), first = pad.notes[noteId], names = new Map(padFrames(state, { withShelved: true }).frames.map(f => [f.frameId, f.shownName]));
  const isEvent = KIND_OF[first.colour] === 'event' && !parseNote(first.text, first.colour).external;
  const frameOf = n => Object.values(pad.frames).find(f => notesInFrame(pad, f).some(x => x.id === n.id));
  const hasCommand = f => notesInFrame(pad, f).some(x => KIND_OF[x.colour] === 'command' && parseNote(x.text, x.colour).name);
  return {
    noteId, name: parseNote(first.text, first.colour).name || titleAndBody(first.text).title, count: places.length,
    rows: places.map(n => {
      const f = frameOf(n);
      return { noteId: n.id, where: f ? names.get(f.id) : 'loose', frameId: f ? f.id : null, here: n.id === noteId, original: n.id === root, made: isEvent && !!f && hasCommand(f), hidden: n.shelvedIn ? 'shelf' : n.foldedInto ? 'folded' : null };
    })
  };
}
