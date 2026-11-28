// ALTERNATE FLOWS - Commands (Put In Ending Flow, Put Alternates In Flows)
// Records the book's existing flow events (FlowCreated, SliceFlowSet): no event of its own. In the caller's batch, so one undo.
import { projectState } from '../../core/projections.js';
import { createFlow, setSliceFlow } from '../board/command.js';
import { flowNameFor, flowNameOf, existingFlowFor, needsFlow } from './alternateFlows.rules.js';

function put(sliceId, name) {
  const state = projectState();
  const slice = state.slices[sliceId];
  if (!name || !slice || !needsFlow(state, slice)) return null;
  const flowId = existingFlowFor(state, slice.chapterId, slice.alternateOf, name) || createFlow(slice.chapterId, name);
  setSliceFlow(sliceId, flowId);
  return flowId;
}

// A new alternate goes in a flow of its chapter named after its ending (an alternate of a slice that is in a flow is in it already: left alone)
export const putInEndingFlow = (sliceId, endingName) => put(sliceId, flowNameFor(projectState().slices[sliceId]?.name, endingName));

// For books made before: every alternate (of one chapter, or of the book) with no flow gets one. → how many were moved
export function putAlternatesInFlows({ chapterId = null, skipRefined = false } = {}) {
  const before = projectState();
  const todo = Object.values(before.slices).filter(s => (!chapterId || s.chapterId === chapterId) && needsFlow(before, s) && !(skipRefined && s.refined));
  return todo.filter(s => put(s.id, flowNameOf(projectState(), s))).length;
}
