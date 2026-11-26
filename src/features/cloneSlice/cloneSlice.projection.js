// CLONE SLICE - What the book's events say about clones (called by core/projections.js once per event, after its own handling)
// state.slices[id].alternateOf: the slice this one is an alternate ending of. A build without this feature ignores the event;
// a snapshot carries the field with the slice.
import { CloneSliceEvents as E } from './cloneSlice.events.js';

export function projectCloneSlice(state, event) {
  if (event.type === E.SliceCloned && state.slices[event.data.sliceId] && event.data.from) state.slices[event.data.sliceId].alternateOf = event.data.from;
}
