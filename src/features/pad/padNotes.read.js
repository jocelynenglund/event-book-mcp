// ===========================================
// PAD - Notes (SV: Pad Notes)
// The plain sticky notes on the canvas, in the order they were added (the later one draws on top): where each is, its
// colour, what that colour stands for, and exactly what was typed. A note still being typed on this device (not recorded
// until she is done) is listed too, flagged as a draft. selectedIds and editing ({ id, value }: the text typed so far) are
// this device's: an orange note named "… (external)" or "external: …" says it is `external` (drawn yellow, as the board draws another system's event; its colour stays orange), each note says its title and body lines (what it draws; a scenario note its rows, each behind its G, W or T; a screen note its wireframe: padScreen.rules.js; an automation note its title and its reads / → rows: padAutomation.rules.js), how many places it is in (a linked note's copies; 1 on its own), its text size (a long note's shrinks to fit the square), and says whether it is selected (and so offers ✕) and whether it is a text box.
// ===========================================

import { KIND_OF, placesOf } from './sketch.js';
import { scenarioLines } from './padScenario.rules.js';
import { wireframe } from './padScreen.rules.js';
import { automationLines } from './padAutomation.rules.js';
import { externalName } from './padNote.rules.js';

// A note is a square with room for about 148 units of text each way: its text keeps the first size it fits in
// (a plain estimate: about 0.55 of the font size per letter, 1.4 for a line), the smallest when nothing does
const ROOM = 148, SIZES = [['m', 15], ['s', 12.5], ['xs', 10.5]];
export function textSize(text) {
  const fits = ([, px]) => {
    const perLine = Math.floor(ROOM / (px * 0.55));
    return String(text).split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / perLine)), 0) * px * 1.4 <= ROOM;
  };
  return (SIZES.find(fits) || SIZES[SIZES.length - 1])[0];
}

// What she typed, split for drawing: the first non-empty line is the title, the lines after it the body (kept as typed, the
// empty ones before and after trimmed)
export function titleAndBody(text) {
  const lines = String(text ?? '').split('\n'), first = lines.findIndex(l => l.trim());
  if (first < 0) return { title: '', bodyLines: [] };
  const body = lines.slice(first + 1);
  while (body.length && !body[0].trim()) body.shift();
  while (body.length && !body[body.length - 1].trim()) body.pop();
  return { title: lines[first].trim(), bodyLines: body };
}

export function padNotes(state, { draft = null, editable = true, selectedIds = [], editing = null } = {}) {
  const pad = state.pad || { notes: {}, frames: {} };
  const note = (n, extra = {}) => {
    const drawn = { noteId: n.id, x: n.x, y: n.y, colour: n.colour, kind: KIND_OF[n.colour], text: n.text, ...titleAndBody(n.text), size: textSize(n.text), places: Math.max(1, placesOf(pad, n.id).length), draft: false, selected: selectedIds.includes(n.id), editing: editing?.id === n.id, editable, ...extra };
    return { ...drawn, ...(drawn.colour === 'orange' && externalName(drawn.title).external ? { external: true } : {}), scenario: drawn.colour === 'scenario' ? scenarioLines(drawn.text) : null, screen: drawn.colour === 'screen' ? { ...wireframe(drawn.text), key: n.id } : null,
      automation: drawn.colour === 'automation' ? automationLines(drawn.text) : null };
  };
  const notes = Object.values(state.pad?.notes || {}).map(n => note(n, editing?.id === n.id && editing.value != null ? { text: editing.value, ...titleAndBody(editing.value), size: textSize(editing.value) } : {}));
  if (draft) notes.push(note({ id: draft.noteId, x: draft.x, y: draft.y, colour: draft.colour, text: editing?.value ?? '' }, { draft: true, editing: true, selected: false }));
  return { editable, notes };
}
