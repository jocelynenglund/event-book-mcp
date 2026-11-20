// ===========================================
// RETIRE - SV: Retire Anyway Confirm — what the owner is asked before retiring a plan on her word: the slices not
// confirmed built (no SliceMarkedBuilt, or cleared), by name. { modelId, total, unconfirmed: [name], text }.
// ===========================================

import { projectState, sliceTitle } from '../../core/projections.js';

export function retireAnywayConfirm(events, modelId = null) {
  const state = projectState(events);
  const slices = state.sliceOrder.map(id => state.slices[id]).filter(Boolean);
  const unconfirmed = slices.filter(s => !s.built).map(s => sliceTitle(s, state));
  return { modelId, total: slices.length, unconfirmed,
    text: `${unconfirmed.length} of ${slices.length} slices aren't confirmed built from the tests. Retire it on your word?` };
}
