// ===========================================
// PAD - Kind card (SV: Pad Kind Card)
// The small card that opens on a note colour of the strip (hover on a computer, a long press on a phone): the kind's name, what it is for, how it is
// written and a real example, drawn as the Pad draws that note (one row of Pad Notes, so the same note component draws it). `canAdd` says whether
// "Add this example" is offered (not where the book can not be changed). The example is the kind's own words (padGuide.rules.js).
// colour: one of the Pad's note colours. -> null for any other
// ===========================================

import { GUIDE_ENTRIES, VARIANTS } from './padGuide.rules.js';
import { padNotes } from './padNotes.read.js';

// One kind as the card and the guide show it: { colour, name, purpose, format, example: a Pad Notes row (its `text` is what "Add this example" adds) }
export function kindView(kind) {
  const key = kind.key || kind.colour;
  const state = { pad: { notes: { [`guide-${key}`]: { id: `guide-${key}`, x: 0, y: 0, colour: kind.colour, text: kind.example, linkOf: null } }, frames: {} } };
  return { key, colour: kind.colour, name: kind.name, purpose: kind.purpose, format: kind.format, example: padNotes(state, { editable: false }).notes[0] };
}

// One small example, drawn as the Pad draws that note: { label, example: a Pad Notes row }
const variantView = (colour, v) => ({ label: v.label, example: padNotes({ pad: { notes: { [`variant-${v.label}`]: { id: `variant-${v.label}`, x: 0, y: 0, colour, text: v.example, linkOf: null } }, frames: {} } }, { editable: false }).notes[0] });

// colour: a note colour of the strip (or the key of a guide entry: "Add this example" asks for those too)
export function padKindCard(state, { colour, editable = true } = {}) {
  const kind = GUIDE_ENTRIES.find(k => (k.key || k.colour) === colour);
  return kind ? { ...kindView(kind), canAdd: editable, variants: (VARIANTS[kind.key ? '' : kind.colour] || []).map(v => variantView(kind.colour, v)) } : null;
}
