// ===========================================
// PAD - Screen In Slice (SV)
// A screen sticky made from a Pad screen note keeps its wireframe text (ScreenSketchSet). Seen from one slice it is in, the board and the slice
// page draw it small with what that slice is about lit and the rest dim: in a command slice the inputs and the button that sends its command
// (the read models dim), in a view slice that read model (the inputs, buttons and other read models dim); a slice with neither lights nothing.
// -> { key, title, empty, lines: [[part]] } (padScreen.rules.js wireframe, each part with `dim`), or null for a sticky that is not a screen
// with a sketch (or a slice that is not there). The key tells the same screen apart in each slice it is in.
// ===========================================

import { wireframe } from './padScreen.rules.js';

export function screenInSlice(state, sliceId, elementId) {
  const el = state.elements[elementId], slice = state.slices[sliceId];
  if (el?.type !== 'screen' || !el.sketch || !slice) return null;
  const named = type => slice.elements.map(id => state.elements[id]).filter(e => e?.type === type).map(e => e.name);
  return { key: `${sliceId}:${elementId}`, ...wireframe(el.sketch, { commands: named('command'), readModels: named('readModel') }) };
}
