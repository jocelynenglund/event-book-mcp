// ===========================================
// PAD - Scenario strips
// SC: Make Pad Scenario — the selected example notes (a row, read left to right: padStrip.rules.js) become one grey scenario note below them, inside
// their frame when they are in one (the frame grows to hold it).
// SC: Lay Out Pad Scenario — a scenario note's Given / When / Then drawn as a row of example notes below it, which become the selection.
// Each is one batch, so one undo takes it all back. Both return { refused, ... }: refused says why nothing was done.
// ===========================================

import { projectState } from '../../core/projections.js';
import { newId } from '../board/command.js';
import { addNote, addNotes, changeFrame } from './command.js';
import { previewStrip, layOutOf, rowBelow } from './padStrip.rules.js';
import { NOTE_SIZE, GROUP_MARGIN } from './sketch.js';

// -> { refused, noteId }
export function makeScenario({ noteIds = [], name = null, mustHave = false, noteId = newId('pn') }) {
  const state = projectState(), strip = previewStrip(state, noteIds, { name: name || null, mustHave });
  if (!strip.ok) return { refused: strip.why, noteId: null };
  const refused = addNote({ noteId, x: strip.at.x, y: strip.at.y, colour: 'scenario', text: strip.text });
  if (refused) return { refused, noteId: null };
  const frame = strip.frameId && state.pad.frames[strip.frameId];
  if (frame) changeFrame(frame.id, { w: Math.max(frame.w, strip.at.x + NOTE_SIZE + GROUP_MARGIN - frame.x), h: Math.max(frame.h, strip.at.y + NOTE_SIZE + GROUP_MARGIN - frame.y) });
  return { refused: null, noteId };
}

// -> { refused, noteIds, left: [what could not be drawn] }
export function layOutScenario({ noteId }) {
  const state = projectState(), { notes, left } = layOutOf(state, noteId);
  if (!notes.length) return { refused: 'Nothing to lay out: this scenario has no Given, When or Then to draw', noteIds: [], left };
  const note = state.pad.notes[noteId], at = rowBelow(state.pad, note, notes.length);
  const drawn = notes.map((n, i) => ({ noteId: newId('pn'), x: at[i].x, y: at[i].y, colour: n.colour, text: n.text }));
  const refused = addNotes(drawn);
  return { refused, noteIds: refused ? [] : drawn.map(n => n.noteId), left };
}
