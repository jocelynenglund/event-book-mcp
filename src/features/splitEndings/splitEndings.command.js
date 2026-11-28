// ===========================================
// SPLIT ENDINGS - Command: Split Into Endings
// SC: Split Into Endings — a change slice that shows 2+ outcome events becomes one slice per outcome: the original keeps the outcome most scenarios
//     end in (ties: the first drawn); for each other outcome the slice is cloned (Clone Slice: "alternate of …", screen and command reused), the
//     event goes onto the clone and off the original, and the scenarios whose Then is that event move to the clone. One action: one undo.
// Refused (returns why, records nothing): a slice that is gone or has no alternate outcomes. Used through the fix list (fixes.command.js) and split_endings.
// ===========================================

import { projectState, sliceTitle, getScenariosForSlice } from '../../core/projections.js';
import { addToSlice, removeFromSlice } from '../board/command.js';
import { moveScenario } from '../scenarios/command.js';
import { cloneSlice } from '../cloneSlice/cloneSlice.command.js';
import { putInEndingFlow } from '../alternateFlows/alternateFlows.command.js'; // feature: alternate-flows
import { endingsOf, keptOutcome } from './splitEndings.rules.js';

// plan(state, sliceId) → why it can't, or { touches, go() → null }  (the shape fixes.command.js plans have)
export function splitEndingsPlan(state, sliceId) {
  const slice = state.slices[sliceId];
  if (!slice) return 'No such slice';
  const outs = endingsOf(state, slice);
  if (!outs) return `${sliceTitle(slice, state)} has no alternate outcomes to split`;
  const kept = keptOutcome(state, slice, outs);
  const title = sliceTitle(slice, state);
  const scenarios = getScenariosForSlice(sliceId, state);
  return { touches: [sliceId], go: () => {
    // last drawn first: each clone lands right after the original, so they end up in drawn order
    for (const e of outs.filter(x => x.id !== kept.id).reverse()) {
      const made = cloneSlice({ sliceId, name: `${title} (${e.name})`, keep: { events: false, scenarios: false } });
      if (typeof made === 'string') return made;
      addToSlice(made.sliceId, 'event', { elementId: e.id });
      removeFromSlice(sliceId, e.id);
      putInEndingFlow(made.sliceId, e.name); // feature: alternate-flows
      scenarios.filter(s => s.then?.type === 'event' && s.then.eventId === e.id).forEach(s => moveScenario(s.id, made.sliceId));
    }
    return null;
  } };
}

export function splitEndings(sliceId, state = projectState()) {
  const plan = splitEndingsPlan(state, sliceId);
  return typeof plan === 'string' ? plan : plan.go();
}
