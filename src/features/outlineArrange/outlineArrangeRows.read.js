// ===========================================
// OUTLINE ARRANGE - Rows (SV: Outline Arrange Rows)
// What Arrange mode lists: the chapters in order, grouped under the part each stands in (chapters before the first part
// are the group with no part), each with its name and how many slices it holds. A row can start a part ("＋ Part here")
// unless a part already starts at it. arrangeable: false (a book not checked out here) leaves the rows plain.
// ===========================================

import { chapterParts } from '../arrange/chapterParts.read.js';

const count = n => n ? `${n} ${n === 1 ? 'slice' : 'slices'}` : 'no slices';

export function outlineArrangeRows(state, { arrangeable = true } = {}) {
  const slicesIn = id => Object.values(state.slices).filter(s => s.chapterId === id).length;
  const starts = new Set(state.parts.map(p => p.firstChapter));
  return {
    arrangeable,
    groups: chapterParts(state).map(g => ({
      partId: g.partId,
      rows: g.chapterIds.map(id => {
        const slices = slicesIn(id);
        return { chapterId: id, name: state.chapters[id].name, slices, count: count(slices), editable: arrangeable, canStartPart: arrangeable && !starts.has(id) };
      })
    }))
  };
}
