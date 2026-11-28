// ALTERNATE FLOWS - Alternate Row Flow Tag (SV)
// The small tag on an alternate's Outline row: the name of the flow it is in. null for a slice that is no alternate or is in no flow.
// -> { sliceId, flow: 'it fails' }
import { sliceFlow } from '../../core/projections.js';

export function alternateRowFlowTag(state, sliceId) {
  const slice = state.slices[sliceId];
  const flow = slice?.alternateOf && state.slices[slice.alternateOf] ? sliceFlow(slice, state) : null;
  return flow ? { sliceId, flow: flow.name } : null;
}

// The Outline row's extra (outline/outlineSliceRow.read.js)
export const alternateRowFlowTagExtra = (state, slice) => { const view = alternateRowFlowTag(state, slice.id); return view ? { kind: 'alternateFlow', view } : null; };
