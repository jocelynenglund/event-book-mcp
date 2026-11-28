// The event of the Clone Slice feature (this folder is the whole feature: see README.md)
export const CloneSliceEvents = {
  SliceCloned: 'SliceCloned',   // a slice was made as an alternate ending of another (its provenance) { sliceId, from }
  SliceAlternateOfSet: 'SliceAlternateOfSet'   // an alternate now points at another slice, or at none (alternateOf: null) { sliceId, alternateOf }
};
