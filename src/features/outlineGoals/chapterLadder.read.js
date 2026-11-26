// OUTLINE GOALS - View: Chapter Ladder (feature: outline-goals)
// How far a chapter has got: none, described, criteria, events, slices, scenarios, refined, built (the furthest rung reached).
import { reachedRung } from './rules.js';

export function chapterLadder(state, chapterId) {
  return { chapterId, reached: reachedRung(state, chapterId) };
}
