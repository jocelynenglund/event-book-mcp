// ===========================================
// OUTLINE DESKTOP - Outline Open Slice (SV: S2 Slice opened in place)
// What a slice shows when its row is opened in the document: its flow (screen, command, event: the stickies in read order),
// whether it is refined (the person's own tick), whether scenarios can be added, and its scenarios' ids, must
// haves first. The scenarios themselves are Scenario Columns, one view each. editable: this device can change the book here. adding: the name box for a new scenario is open (a device's own).
// ===========================================

import { getScenariosForSlice, sliceTitle, refinedState } from '../../core/projections.js';

// Read order of a slice's stickies: the way its story flows through the lanes (as the Outline's chain)
const laneFlow = { SC: [0, 1, 2], SV: [2, 1, 0], AU: [2, 0, 1] };
const laneOf = { screen: 0, processor: 0, command: 1, readModel: 1, event: 2 };

export function outlineOpenSlice(state, sliceId, { editable = true, adding = false } = {}) {
  const slice = state.slices[sliceId];
  if (!slice) return null;
  const els = slice.elements.map(id => state.elements[id]).filter(Boolean);
  const flow = (laneFlow[slice.type] || [0, 1, 2]).flatMap(l => els.filter(e => laneOf[e.type] === l)).map(e => ({ type: e.type, name: e.name }));
  const scenarios = getScenariosForSlice(sliceId, state);
  const ordered = [...scenarios.filter(s => s.mustHave), ...scenarios.filter(s => !s.mustHave)];
  return {
    sliceId, title: sliceTitle(slice, state), type: slice.type,
    flow,
    refined: !!refinedState(state, sliceId)?.refined,
    canAdd: !!editable, adding: !!adding && !!editable,
    scenarioIds: ordered.map(s => s.id)
  };
}
