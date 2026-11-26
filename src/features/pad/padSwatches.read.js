// ===========================================
// PAD - Swatches (SV: Pad Swatches)
// The strip of eight plain colours: drag one onto the canvas for a new note, tap one to colour the selected notes (or to
// choose the colour of the next note). Blue stands for a command, orange for an event, green for a view, red for a hotspot, white for a plain note, warm grey for a scenario, a white window for a screen, lilac for an automation.
// The lit one is the colour of the selected notes (none when they differ: a tap colours them all), and with no note selected the colour
// last used, which the next new note gets. null where the book can not be changed.
// ===========================================

import { COLOURS, KIND_OF } from './sketch.js';

const KIND_NAME = { command: 'command', event: 'event', readModel: 'view', hotspot: 'hotspot', note: 'note', scenario: 'Given, When, Then', screen: 'screen sketch', automation: 'automation' };

export function padSwatches(state, { colour = 'blue', editable = true, selection = {} } = {}) {
  if (!editable) return null;
  const chosen = [...new Set((selection.noteIds || []).map(id => state.pad?.notes[id]?.colour).filter(Boolean))];
  const lit = chosen.length ? (chosen.length === 1 ? chosen[0] : null) : colour;
  return { swatches: COLOURS.map(c => ({ colour: c, kind: KIND_OF[c], label: `${c[0].toUpperCase()}${c.slice(1)} note (${KIND_NAME[KIND_OF[c]]})`, current: c === lit })) };
}
