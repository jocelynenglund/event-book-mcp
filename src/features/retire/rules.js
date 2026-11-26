// ===========================================
// RETIRE - SC: Retire Plan — a plan whose every slice is built is put away. PlanRetired { modelId, app, edition,
// retiredAt } goes onto the plan's own book, which is read only from then on (editions/rules.js isFrozen) and
// never deleted. Pure over the plan's history: { events } or { refused }.
// ===========================================

import { readyToRetire } from './readyToRetire.read.js';
import { projectState, sliceTitle } from '../../core/projections.js';
import { compareModels } from '../compare/diff.js';

export function retirePlan(history, { modelId = null, now = new Date().toISOString() } = {}) {
  const v = readyToRetire(history, modelId);
  if (v.retired) return { refused: 'Already retired' };
  if (!v.ready) return { refused: `${v.built} of ${v.total} slices built: retire it once every slice is built` };
  return { events: [{ type: 'PlanRetired', data: { modelId, app: v.app, edition: v.edition, retiredAt: now } }] };
}

// SC: Retire Shipped Plan — a plan every slice of which the app's built book has (matched as Compare matches: a
// change by its command, a view by its read model; "differs" counts) is confirmed against that build and retired in
// one go: SliceMarkedBuilt { sliceId, commit, edition } for each slice not marked at that commit, then PlanRetired.
// Refined is not asked for (the build is the confirmation) and never set. Pure: the plan's history and the built
// book's state in; { events, confirmed }, { refused } or { already } out. A slice the build lacks refuses, naming it
// and Compare's "maybe renamed" suggestion.
export function retireShipped(history, built, { modelId = null, commit = null, edition = null, map = [], now = new Date().toISOString() } = {}) {
  const plan = projectState(history);
  if (plan.retired) return { already: true };
  const rows = compareModels(plan, built).rows.filter(r => r.plan);
  if (!rows.length) return { refused: 'The plan has no slices to confirm' };
  const matched = r => r.built && (r.status === 'built' || r.status === 'differs');
  // map: [{ sliceId, built: name }] — a name-matching aid: a plan slice counts as matched when a slice of that name
  // exists in the built book (it is no override: a name the book lacks matches nothing)
  const byName = name => Object.values(built.slices).find(b => sliceTitle(b, built).trim().toLowerCase() === String(name).trim().toLowerCase());
  const mapped = [], missing = [];
  const viaMap = r => {
    const m = map.find(x => x.sliceId === r.plan.id);
    if (!m) return false;
    if (byName(m.built)) { mapped.push({ title: r.title, built: m.built }); return true; }
    missing.push({ title: r.title, built: m.built });
    return false;
  };
  const unmatched = rows.filter(r => !matched(r) && !viaMap(r));
  if (unmatched.length) {
    const lines = unmatched.map(r => (r.status === 'maybe' ? `${r.title} (maybe renamed: ${r.renamed.to})` : r.title) + (missing.find(x => x.title === r.title) ? ` (the built book has no slice "${missing.find(x => x.title === r.title).built}")` : ''));
    return { refused: `${unmatched.length} of ${rows.length} slices are not in the built book: ${lines.join('; ')}. Nothing was changed.`,
      unmatched: unmatched.map(r => ({ sliceId: r.plan.id, title: r.title })) };
  }
  const marks = rows.filter(r => !(r.plan.built && r.plan.builtCommit === commit))
    .map(r => ({ type: 'SliceMarkedBuilt', data: { sliceId: r.plan.id, commit, ...(edition != null ? { edition } : {}) } }));
  const r = retirePlan([...history, ...marks], { modelId, now });
  if (r.refused) return r;
  return { events: [...marks, ...r.events], confirmed: rows.length, mapped };
}
