// CLONE SLICE - Scenario Own Ending (SV)
// Whether a scenario in a slice's drawer offers "Give this its own ending": only for a change's scenario. -> { scenarioId, sliceId, offered }
import { cloneable } from './cloneSlice.rules.js';

export function scenarioOwnEnding(book, scenarioId) {
  const scn = book.scenarios[scenarioId], slice = scn && book.slices[scn.sliceId];
  return { scenarioId, sliceId: scn?.sliceId || null, offered: !!slice && slice.type === 'SC' && cloneable(slice, slice.id) };
}

// The drawer's extra on a scenario (board/sheets/sliceScenariosDrawer.read.js): nothing when it is not offered
export function scenarioOwnEndingExtra(book, scenarioId) {
  const view = scenarioOwnEnding(book, scenarioId);
  return view.offered ? { kind: 'ownEnding', view } : null;
}
