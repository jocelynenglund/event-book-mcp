// ===========================================
// MODEL.MD - Import Report (SV): what the import found, shown right after it
// The counts, the lines kept as notes, and the book's completeness gaps: a field with no source (the same list the fix list shows)
// and an event no slice records (what a model.md checker is for). Each gap names its slice, so a tap goes there.
//   importReport(state, result) → { title, counts: { chapters, slices, scenarios }, refined, notes: [{ slice, kept }],
//                                   gaps: [{ sliceId, chapterId, slice, rows: [{ elementId, sticky, why }] }], total, clean }
//   result: what Import Model Md gave back ({ name, counts, skippedLines, refined })
// ===========================================

import { fixList } from '../fieldSources/fixList.read.js';
import { sliceTitle, projectState } from '../../core/projections.js';

export const NOBODY_RECORDS = 'no slice records it';

// Events the book reads (a view draws them, an automation wakes on them, a scenario starts from them) that no change slice records.
// An event another system records (🟨) or that is kept elsewhere (🟫) is not ours to record.
function unrecorded(state) {
  const slices = state.sliceOrder.map(id => state.slices[id]).filter(Boolean);
  const recorded = new Set(slices.filter(s => s.type === 'SC').flatMap(s => s.elements));
  // Where each one is read (the slice a tap goes to): a view or a view half that draws it, a scenario that starts from it, an automation it wakes
  const readBy = new Map();
  const note = (id, slice) => { if (!readBy.has(id)) readBy.set(id, slice); };
  slices.forEach(s => s.elements.forEach(id => { if (!recorded.has(id)) note(id, s); }));
  Object.values(state.scenarios || {}).forEach(scn => (scn.given || []).forEach(g => note(g.elementId, state.slices[scn.sliceId])));
  Object.values(state.scenarios || {}).forEach(scn => { if (scn.then?.eventId) note(scn.then.eventId, state.slices[scn.sliceId]); });
  state.connections.filter(c => c.relation === 'trigger').forEach(c => note(c.from, slices.find(s => s.elements.includes(c.to))));
  return [...readBy].filter(([id]) => {
    const e = state.elements[id];
    return e?.type === 'event' && !recorded.has(id) && !e.external && !e.storage && !e.table;
  }).map(([id, slice]) => ({ elementId: id, sticky: state.elements[id].name, why: NOBODY_RECORDS, slice }));
}

export function importReport(state, result) {
  const gaps = fixList(state, { all: true }, { readOnly: true }).groups.map(g => ({
    sliceId: g.sliceId, chapterId: g.chapterId, slice: g.slice, rows: g.rows.map(r => ({ elementId: r.elementId, sticky: r.field && r.field !== '(the event)' ? `${r.sticky}.${r.field}` : r.sticky, why: r.why }))
  }));
  unrecorded(state).forEach(r => {
    const at = r.slice;
    let group = at && gaps.find(g => g.sliceId === at.id);
    if (!group) gaps.push(group = { sliceId: at?.id || null, chapterId: at?.chapterId || null, slice: at ? sliceTitle(at, state) : 'Not on a slice', rows: [] });
    group.rows.push({ elementId: r.elementId, sticky: r.sticky, why: r.why });
  });
  const total = gaps.reduce((n, g) => n + g.rows.length, 0);
  return {
    title: result.name || state.modelName || 'model.md', counts: result.counts, refined: result.refined || 0,
    notes: (result.skippedLines || []).map(k => ({ slice: k.slice || k.chapter || '', kept: String(k.kept ?? k.line ?? '') })),
    gaps, total, clean: !total && !(result.skippedLines || []).length
  };
}

// The report of the book as it is now, right after the import (the sheet asks for it)
export const importReportNow = result => importReport(projectState(), result);
