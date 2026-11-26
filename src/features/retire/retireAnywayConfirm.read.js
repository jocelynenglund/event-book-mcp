// ===========================================
// RETIRE - SV: Retire Anyway Confirm — what the owner is asked before retiring a plan on her word: the slices not
// confirmed built (no SliceMarkedBuilt, or cleared), by name, and the evidence an agent noted for them. { modelId, total, unconfirmed: [name], evidence?: [{ slice, notes }], text }.
// ===========================================

import { projectState, sliceTitle } from '../../core/projections.js';

export function retireAnywayConfirm(events, modelId = null) {
  const state = projectState(events);
  const slices = state.sliceOrder.map(id => state.slices[id]).filter(Boolean);
  const open = slices.filter(s => !s.built);
  const unconfirmed = open.map(s => sliceTitle(s, state));
  // What an agent noted for these slices (retire_plan evidence): shown with each, never a reason to retire
  const evidence = open.filter(s => state.retireEvidence?.[s.id]?.length)
    .map(s => ({ slice: sliceTitle(s, state), notes: state.retireEvidence[s.id].map(n => n.text) }));
  return { modelId, total: slices.length, unconfirmed, ...(evidence.length ? { evidence } : {}),
    text: `${unconfirmed.length} of ${slices.length} slices aren't confirmed built from the tests. Retire it on your word?` };
}
