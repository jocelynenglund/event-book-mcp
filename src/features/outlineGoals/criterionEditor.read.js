// OUTLINE GOALS - View: Criterion Editor (feature: outline-goals)
// The sheet for a new criterion (criterionId null) or an existing one: its words, every chapter of the book (tagged or not) and,
// for an existing one, the scenarios that could prove it: the book's must haves (the ones in its tagged chapters first) and any
// proof it already has that is no longer a must have (stale, so it can be unlinked).
import { goalsOf, taggedChapters, slicesOf } from './rules.js';
import { sliceTitle } from '../../core/projections.js';

export function criterionEditor(state, criterionId = null) {
  const c = criterionId ? goalsOf(state).criteria[criterionId] : null;
  if (criterionId && (!c || c.removed)) return null;
  const tagged = new Set(c ? taggedChapters(state, c).map(ch => ch.id) : []);
  const chapters = state.chapterOrder.filter(id => state.chapters[id]).map(id => ({ chapterId: id, name: state.chapters[id].name, tagged: tagged.has(id) }));
  const inTagged = new Set([...tagged].flatMap(id => slicesOf(state, id).map(s => s.id)));
  const proofs = !c ? [] : Object.values(state.scenarios)
    .filter(s => s.mustHave || c.proofs.includes(s.id))
    .map(s => ({ scenarioId: s.id, name: s.name, sliceTitle: state.slices[s.sliceId] ? sliceTitle(state.slices[s.sliceId], state) : '',
      linked: c.proofs.includes(s.id), inChapter: inTagged.has(s.sliceId), stale: !s.mustHave }))
    .sort((a, b) => (b.linked - a.linked) || (b.inChapter - a.inChapter));
  return { criterionId: c ? c.id : null, mode: c ? 'edit' : 'add', text: c ? c.text : '', chapters, proofs };
}
