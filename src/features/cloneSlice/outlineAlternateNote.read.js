// CLONE SLICE - Outline Alternate Note (SV)
// What the Outline row of an alternate slice says under its title, muted: "alternate ending" (of which slice, for its title).
// null for a slice that is no alternate, or whose original is gone. -> { sliceId, of: 'S5' }
import { alternateOfMark } from './alternateOfMark.read.js';

export function outlineAlternateNote(state, sliceId) {
  const mark = alternateOfMark(state, sliceId);
  return mark ? { sliceId, of: mark.of } : null;
}

// The Outline row's extra (outline/outlineSliceRow.read.js)
export const outlineAlternateNoteExtra = (state, slice) => { const view = outlineAlternateNote(state, slice.id); return view ? { kind: 'alternateNote', view } : null; };
