// ===========================================
// OUTLINE ARRANGE - Bar (SV: Outline Arrange Bar)
// The line over Arrange mode: how many chapters the book has and how many parts they stand in.
// ===========================================

export function outlineArrangeBar(state) {
  const chapters = state.chapterOrder.filter(id => state.chapters[id]).length, parts = state.parts.length;
  const noun = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  return { chapters, parts, text: parts ? `${noun(chapters, 'chapter', 'chapters')} in ${noun(parts, 'part', 'parts')}` : `${noun(chapters, 'chapter', 'chapters')}, no parts yet` };
}
