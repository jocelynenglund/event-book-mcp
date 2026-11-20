// ===========================================
// ARRANGE - Chapter Parts (SV: Board Parts)
// The chapters in their order, grouped under the parts they stand in: each part with its chapters (ids and names)
// and how many slices they hold. Chapters before the first part are the group "(none)", left out when there are none.
// ===========================================

export const NO_PART = '(none)';

export function chapterParts(state) {
  const slicesIn = id => Object.values(state.slices).filter(s => s.chapterId === id).length;
  const starts = new Map(state.parts.map(p => [p.firstChapter, p]));
  const groups = [];
  state.chapterOrder.filter(id => state.chapters[id]).forEach(id => {
    const part = starts.get(id);
    if (part || !groups.length) groups.push({ partId: part?.id ?? null, part: part?.name ?? NO_PART, chapterIds: [] });
    groups[groups.length - 1].chapterIds.push(id);
  });
  return groups.map(g => ({ ...g, chapters: g.chapterIds.map(id => state.chapters[id].name),
    slices: g.chapterIds.reduce((n, id) => n + slicesIn(id), 0) }));
}
