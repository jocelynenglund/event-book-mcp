// ===========================================
// OUTLINE GOALS - Commands (feature: outline-goals)
// SC: Add Criterion · Reword Criterion · Tag Criterion · Remove Criterion · Link Proof · Unlink Proof
// SC: Describe Chapter · Draft Event · Drop Draft Event
// Each returns why it was refused, or null (done, or nothing to change). A chapter is named by its id or its name.
// ===========================================

import { appendEvent, EventTypes } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { goalsOf, chapterIdOf, sameName, sameSet } from './rules.js';

const record = (type, data) => (appendEvent(type, data) ? null : 'Read only');
const clean = text => String(text ?? '').trim();
export const newCriterionId = () => 'crit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

// The chapter ids a list of names or ids stands for, or why not
function resolveChapters(state, refs) {
  const ids = [];
  for (const ref of refs || []) {
    const id = chapterIdOf(state, ref);
    if (!id) return { why: `No chapter called ${clean(ref)}` };
    if (!ids.includes(id)) ids.push(id);
  }
  return { ids };
}

const criterionOf = (state, criterionId) => goalsOf(state).criteria[criterionId];

export function addCriterion({ criterionId = newCriterionId(), text, chapters = [], state = projectState() } = {}) {
  const words = clean(text);
  if (!words) return 'Write the criterion first';
  const tagged = resolveChapters(state, chapters);
  if (tagged.why) return tagged.why;
  if (criterionOf(state, criterionId)) return null;
  return record(EventTypes.CriterionAdded, { criterionId, text: words, chapters: tagged.ids });
}

export function rewordCriterion({ criterionId, text, state = projectState() } = {}) {
  const c = criterionOf(state, criterionId);
  if (!c || c.removed) return 'That criterion was removed';
  const words = clean(text);
  if (!words) return 'Write the criterion first';
  if (words === c.text) return null;
  return record(EventTypes.CriterionReworded, { criterionId, text: words });
}

export function tagCriterion({ criterionId, chapters = [], state = projectState() } = {}) {
  const c = criterionOf(state, criterionId);
  if (!c || c.removed) return 'That criterion was removed';
  const tagged = resolveChapters(state, chapters);
  if (tagged.why) return tagged.why;
  if (sameSet(tagged.ids, c.chapters)) return null;
  return record(EventTypes.CriterionTagged, { criterionId, chapters: tagged.ids });
}

export function removeCriterion({ criterionId, state = projectState() } = {}) {
  const c = criterionOf(state, criterionId);
  if (!c || c.removed) return null;
  return record(EventTypes.CriterionRemoved, { criterionId });
}

export function linkProof({ criterionId, scenarioId, state = projectState() } = {}) {
  const c = criterionOf(state, criterionId);
  if (!c || c.removed) return 'That criterion was removed';
  const scn = state.scenarios[scenarioId];
  if (!scn) return 'No such scenario';
  if (!scn.mustHave) return `${scn.name} is a nice to have: mark it ★ must have to prove a criterion`;
  if (c.proofs.includes(scenarioId)) return null;
  return record(EventTypes.CriterionProofLinked, { criterionId, scenarioId });
}

export function unlinkProof({ criterionId, scenarioId, state = projectState() } = {}) {
  const c = criterionOf(state, criterionId);
  if (!c || c.removed || !c.proofs.includes(scenarioId)) return null;
  return record(EventTypes.CriterionProofUnlinked, { criterionId, scenarioId });
}

export function describeChapter({ chapterId, description, state = projectState() } = {}) {
  const id = chapterIdOf(state, chapterId);
  if (!id) return `No chapter called ${clean(chapterId)}`;
  const words = clean(description);
  if (words === clean(goalsOf(state).descriptions[id])) return null;
  return record(EventTypes.ChapterDescribed, { chapterId: id, description: words });
}

export function draftEvent({ chapterId, name, state = projectState() } = {}) {
  const id = chapterIdOf(state, chapterId);
  if (!id) return `No chapter called ${clean(chapterId)}`;
  const words = clean(name);
  if (!words) return 'Name the event';
  if ((goalsOf(state).drafts[id] || []).some(n => sameName(n, words))) return null;
  return record(EventTypes.EventDrafted, { chapterId: id, name: words });
}

export function dropDraftEvent({ chapterId, name, state = projectState() } = {}) {
  const id = state.chapters[chapterId] ? chapterId : (chapterIdOf(state, chapterId) || chapterId);
  const had = (goalsOf(state).drafts[id] || []).find(n => sameName(n, clean(name)));
  if (!had) return null;
  return record(EventTypes.DraftEventDropped, { chapterId: id, name: had });
}
