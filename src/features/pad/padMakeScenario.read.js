// ===========================================
// PAD - Make scenario (SV: Pad Make Scenario)
// The sheet that opens on Make scenario…: the selected example notes read left to right as a scenario (padStrip.rules.js), before the grey note is
// made: its name (typed so far, else the frame's, else "Scenario"), the must-have star, the G / W / T it says, and a warning for whatever can not
// be placed (an event with no such field, a second Then). `where` says where the note will go. Nothing is refused here: a warning does not stop it.
// ui: { noteIds, name (null: not typed yet), mustHave }.
// ===========================================

import { previewStrip } from './padStrip.rules.js';

export function padMakeScenario(state, { noteIds = [], name = null, mustHave = false } = {}) {
  const s = previewStrip(state, noteIds, { name: name || null, mustHave });
  return {
    name: name ?? s.defaultName ?? '', mustHave, rows: s.rows, warnings: s.ok ? s.warnings : [s.why], canMake: s.ok,
    where: s.frameId ? 'The scenario note goes below the row, inside its frame' : 'The scenario note goes below the row'
  };
}
