// OUTLINE GOALS - View: Acceptance Criteria (feature: outline-goals)
// The criteria still in the book, in the order they were added: its words, the chapters it is tagged to that the book has,
// the must-have scenarios that prove it, and whether any does.
import { activeCriteria, taggedChapters, provingScenarios } from './rules.js';

export function acceptanceCriteria(state) {
  return activeCriteria(state).map(c => {
    const proofs = provingScenarios(state, c).map(s => ({ scenarioId: s.id, name: s.name }));
    return { criterionId: c.id, text: c.text, chapters: taggedChapters(state, c).map(ch => ({ chapterId: ch.id, name: ch.name })), proofs, proven: proofs.length > 0 };
  });
}
