// ===========================================
// OUTLINE DESKTOP - Comment Target (SV: S5 Jump to a comment's place)
// Where one comment is, in words and in ids: a scenario (and which line of it), a slice, or the whole book (the board chat).
// The tap on its link scrolls the document to chapterId / sliceId / scenarioId, opens the slice if it is shut and outlines
// the place. A comment whose slice or scenario was removed says so and goes nowhere. commentId: a thread, or a reply to one.
// ===========================================

import { sliceTitle, sliceRef } from '../../core/projections.js';

const PART = { given: 'Given', when: 'When', then: 'Then' };

export function commentTarget(state, commentId) {
  const c = state.comments?.[commentId];
  const root = c?.threadId ? state.comments[c.threadId] : c;
  if (!root || root.deleted) return null;
  const base = { commentId: root.id, sliceId: null, scenarioId: null, chapterId: null };
  if (!root.sliceId) return { ...base, kind: 'book', label: 'on the whole book' };
  const slice = state.slices[root.sliceId];
  if (!slice) return { ...base, kind: 'gone', label: 'on a slice that was removed' };
  const on = `on ${sliceRef(state, slice.id)} ${sliceTitle(slice, state)}`;
  const place = { ...base, sliceId: slice.id, chapterId: slice.chapterId || null };
  if (!root.scenarioId) return { ...place, kind: 'slice', label: on };
  const scn = state.scenarios[root.scenarioId];
  if (!scn) return { ...place, kind: 'slice', label: `${on} · a scenario that was removed` };
  return { ...place, kind: 'scenario', scenarioId: scn.id, label: `${on} · scenario “${scn.name}”${root.part ? ` › ${PART[root.part]}` : ''}` };
}
