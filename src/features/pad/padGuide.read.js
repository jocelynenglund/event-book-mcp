// ===========================================
// PAD - Guide (SV: Pad Guide)
// The full notation guide (the toolbar's ?): one entry per note colour, in the order of the strip (its name, what it is for, how it is written, a real
// example drawn as that note), then the Pad's general rules. `canAdd`: "Add this example" is offered on each (not where the book can not be changed).
// ===========================================

import { KINDS, RULES } from './padGuide.rules.js';
import { kindView } from './padKindCard.read.js';

export function padGuide(state, { editable = true } = {}) {
  return { kinds: KINDS.map(kindView), rules: RULES, canAdd: editable };
}
