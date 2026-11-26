// OUTLINE GOALS - View: Criteria Proven (feature: outline-goals)
// How many of the book's criteria a must-have scenario proves (a scenario that is deleted or no longer a must have does not count).
import { activeCriteria, isProven } from './rules.js';

export function criteriaProven(state) {
  const all = activeCriteria(state);
  return { proven: all.filter(c => isProven(state, c)).length, total: all.length };
}
