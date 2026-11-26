// ===========================================
// PAD - Scenario strip (SV: Pad Scenario Strip)
// Under the toolbar, one button that depends on the selection (nothing is shown otherwise, so the toolbar keeps its width):
//   a strip of example notes (padStrip.rules.js: 2+ event, command or view notes that make a scenario)  -> "Make scenario…"
//   exactly one scenario note with something to draw                                                     -> "Lay out as notes"
// -> { visible, action: 'make-scenario' | 'lay-out' | null, label, title }
// ===========================================

import { readStrip, layOutOf } from './padStrip.rules.js';

const NONE = { visible: false, action: null, label: '', title: '' };

export function padScenarioStrip(state, { selectedIds = [], editable = true } = {}) {
  const chosen = selectedIds.map(id => state.pad?.notes?.[id]).filter(Boolean);
  if (!editable || !chosen.length) return NONE;
  if (chosen.length === 1 && chosen[0].colour === 'scenario') {
    const { notes } = layOutOf(state, chosen[0].id);
    return notes.length ? { visible: true, action: 'lay-out', label: 'Lay out as notes', title: `Draw this scenario as ${notes.length} example ${notes.length === 1 ? 'note' : 'notes'} in a row below it` } : NONE;
  }
  return readStrip(state, chosen.map(n => n.id)).ok
    ? { visible: true, action: 'make-scenario', label: 'Make scenario…', title: 'Turn the selected example notes, read left to right, into a Given / When / Then scenario note' } : NONE;
}
