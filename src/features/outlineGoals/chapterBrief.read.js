// OUTLINE GOALS - View: Chapter Brief (feature: outline-goals)
// What a chapter says about itself under its heading: its description and the criteria tagged to it (proven or not).
import { goalsOf, activeCriteria, isProven } from './rules.js';

export function chapterBrief(state, chapterId) {
  return {
    chapterId,
    description: String(goalsOf(state).descriptions[chapterId] || '').trim(),
    criteria: activeCriteria(state).filter(c => c.chapters.includes(chapterId)).map(c => ({ criterionId: c.id, text: c.text, proven: isProven(state, c) }))
  };
}
