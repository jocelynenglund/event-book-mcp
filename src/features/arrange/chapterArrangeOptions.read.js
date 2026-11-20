// ===========================================
// ARRANGE - Chapter Arrange Options (SV: Chapter Arrange Options)
// What a chapter's menu offers to arrange it without dragging: a step earlier or later, a move to the end of another
// part, and starting a part at it (not when it starts one already). null when the chapter is gone.
// ===========================================

import { stepChapter, moveIntoPart } from './arrangePlace.rules.js';

export function chapterArrangeOptions(state, chapterId) {
  const chapter = state.chapters[chapterId];
  if (!chapter) return null;
  const at = state.chapterOrder.indexOf(chapterId);
  const own = [...state.parts].reverse().find(p => state.chapterOrder.indexOf(p.firstChapter) <= at) || null;
  return { chapterId, name: chapter.name,
    canEarlier: !!stepChapter(state, chapterId, -1), canLater: !!stepChapter(state, chapterId, 1),
    parts: state.parts.filter(p => p.id !== own?.id && moveIntoPart(state, chapterId, p.id)).map(p => ({ partId: p.id, name: p.name })),
    startsPart: state.parts.some(p => p.firstChapter === chapterId) };
}
