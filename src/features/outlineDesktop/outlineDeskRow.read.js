// ===========================================
// OUTLINE DESKTOP - Outline Desk Row (SV)
// A slice as one closed line of the desktop document: its number, name, kind, whether it is refined, what its scenarios
// are (must haves and nice to haves), and what asks a look (fields with no source, open comments). slice: one of the Outline Layout's.
// open: its row is opened in the document (a device's own setting). traced: it is on the path of the field being traced.
// ===========================================

import { getScenariosForSlice, sliceTitle, sliceRef, refinedState } from '../../core/projections.js';
import { sliceActor } from '../board/command.js';
import { gapCount } from '../fieldSources/rules.js';
import { sliceComments } from '../comments/read.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const KINDS = { SC: 'do', SV: 'see', AU: 'auto' };

export function outlineDeskRow(state, slice, { open = false, trace = null } = {}) {
  const scenarios = getScenariosForSlice(slice.id, state);
  const must = scenarios.filter(s => s.mustHave).length, nice = scenarios.length - must;
  const gaps = gapCount(state, [slice.id]);
  return {
    sliceId: slice.id, open: !!open, traced: !!trace?.slices.includes(slice.id),
    ref: sliceRef(state, slice.id),
    title: sliceTitle(slice, state),
    kind: sliceActor(slice, state) === 'processor' ? 'auto' : KINDS[slice.type] || 'do',
    refined: !!refinedState(state, slice.id)?.refined,
    summary: must ? `${plural(must, 'must have', 'must haves')}${nice ? ` · ${nice} nice` : ''}` : '',
    scenarios: scenarios.length ? plural(scenarios.length, 'scenario', 'scenarios') : 'no scenarios',
    gaps: gaps ? `${plural(gaps, 'field', 'fields')} no source` : '',
    comments: sliceComments(state, slice.id).open
  };
}
