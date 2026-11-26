// OUTLINE GOALS - View: Outline Summary (feature: outline-goals)
// The counts in the pills under the goal: how many criteria and how many chapters the book has.
import { activeCriteria } from './rules.js';

export function outlineSummary(state) {
  return { criteria: activeCriteria(state).length, chapters: state.chapterOrder.filter(id => state.chapters[id]).length };
}
