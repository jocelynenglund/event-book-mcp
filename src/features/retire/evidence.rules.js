// ===========================================
// RETIRE - SC: Note Retire Evidence — an agent says why slices the built book doesn't show are built anyway (tested
// outside Given/When/Then: "PR #78, store tests"). RetireEvidenceNoted { entries: [{ sliceId, text }], by } goes onto the
// plan; it never retires or marks anything: it waits for the owner's Retire anyway, whose prompt lists it beside each
// slice. Pure over the plan's history: { events } or { refused }.
// ===========================================

import { projectState } from '../../core/projections.js';

export function noteEvidence(history, { entries = [], by = null } = {}) {
  const state = projectState(history);
  if (state.retired) return { refused: 'Already retired' };
  const fresh = entries.filter(e => e.text && state.slices[e.sliceId] && !(state.retireEvidence?.[e.sliceId] || []).some(n => n.text === e.text))
    .map(e => ({ sliceId: e.sliceId, text: String(e.text).trim() }));
  if (!fresh.length) return { events: [] };
  return { events: [{ type: 'RetireEvidenceNoted', data: { entries: fresh, by } }] };
}
