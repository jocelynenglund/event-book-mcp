// OUTLINE GOALS - View: Chapter Draft Events (feature: outline-goals)
// The events drafted for a chapter that no slice of it holds yet: a slice holding an event of that name takes the draft in.
import { openDrafts } from './rules.js';

export function chapterDraftEvents(state, chapterId) {
  return { chapterId, drafts: openDrafts(state, chapterId) };
}
