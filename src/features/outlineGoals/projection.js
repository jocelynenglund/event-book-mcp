// ===========================================
// OUTLINE GOALS - the projection's piece (feature: outline-goals)
// core/projections.js hands every event to outlineGoalsProject (one marked line); it keeps its own corner
// of the state, state.outlineGoals, and touches nothing else. A book without these events has no corner.
//   criteria      criterionId -> { id, text, chapters: [chapterId], proofs: [scenarioId], removed }
//   order         criterion ids, as added
//   descriptions  chapterId -> text
//   drafts        chapterId -> [name], as drafted
// ===========================================

import { OutlineGoalsEvents as T } from './events.js';

const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

export function outlineGoalsProject(state, event) {
  const d = event.data || {};
  // A snapshot (Export without history, a share link) brings the corner with it
  if (event.type === 'ModelSnapshot') {
    const kept = d.state?.outlineGoals;
    if (kept) state.outlineGoals = JSON.parse(JSON.stringify(kept)); else delete state.outlineGoals;
    return;
  }
  if (!Object.values(T).includes(event.type)) return;
  const goals = (state.outlineGoals ||= { criteria: {}, order: [], descriptions: {}, drafts: {} });
  const criterion = goals.criteria[d.criterionId];
  switch (event.type) {
    case T.CriterionAdded:
      if (goals.criteria[d.criterionId]) break;
      goals.criteria[d.criterionId] = { id: d.criterionId, text: d.text, chapters: [...(d.chapters || [])], proofs: [], removed: false };
      goals.order.push(d.criterionId);
      break;
    case T.CriterionReworded: if (criterion) criterion.text = d.text; break;
    case T.CriterionTagged: if (criterion) criterion.chapters = [...(d.chapters || [])]; break;
    case T.CriterionRemoved: if (criterion) criterion.removed = true; break;
    case T.CriterionProofLinked: if (criterion && !criterion.proofs.includes(d.scenarioId)) criterion.proofs.push(d.scenarioId); break;
    case T.CriterionProofUnlinked: if (criterion) criterion.proofs = criterion.proofs.filter(id => id !== d.scenarioId); break;
    case T.ChapterDescribed:
      if (String(d.description || '').trim()) goals.descriptions[d.chapterId] = d.description; else delete goals.descriptions[d.chapterId];
      break;
    case T.EventDrafted: {
      const list = (goals.drafts[d.chapterId] ||= []);
      if (!list.some(n => sameName(n, d.name))) list.push(d.name);
      break;
    }
    case T.DraftEventDropped:
      goals.drafts[d.chapterId] = (goals.drafts[d.chapterId] || []).filter(n => !sameName(n, d.name));
      break;
  }
}
