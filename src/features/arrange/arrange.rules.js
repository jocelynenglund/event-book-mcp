// ===========================================
// ARRANGE - Rules (pure over the book's history): { events }, { refused } or { nothing }
// SC: Arrange Chapters — the whole chapter order in one event (one undo), with where each part starts. It must list
//     every chapter once; the same order and parts again changes nothing.
// SC: Start Part — a named part from a chapter, up to the next part. SC: Rename Part. SC: Remove Part — its chapters
//     stay, joining the part before.
// ===========================================

import { projectState } from '../../core/projections.js';

const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const nameOf = (state, id) => state.chapters[id]?.name || id;

export function arrangeChapters(history, { order = [], parts = null, arrangedBy = null } = {}) {
  const state = projectState(history);
  if (order.length !== state.chapterOrder.length || !state.chapterOrder.every(id => order.includes(id))) return { refused: 'The order must list every chapter in the book once' };
  // Where each part starts now, with what the command moves
  const starts = state.parts.map(p => ({ partId: p.id, firstChapter: parts?.find(x => x.partId === p.id)?.firstChapter ?? p.firstChapter }));
  if ((parts || []).some(x => !state.parts.some(p => p.id === x.partId))) return { refused: 'No such part' };
  if (starts.some(s => !order.includes(s.firstChapter)) || new Set(starts.map(s => s.firstChapter)).size < starts.length) return { refused: 'Every part starts at one of the book\'s chapters' };
  if (same(order, state.chapterOrder) && starts.every((s, i) => s.firstChapter === state.parts[i].firstChapter)) return { nothing: true };
  return { events: [{ type: 'ChaptersArranged', data: { order, ...(starts.length ? { parts: starts } : {}), arrangedBy } }] };
}

export function startPart(history, { partId, name, firstChapter }) {
  const state = projectState(history);
  if (!String(name || '').trim()) return { refused: 'Give the part a name' };
  if (!state.chapters[firstChapter]) return { refused: 'No such chapter' };
  const taken = state.parts.find(p => p.firstChapter === firstChapter);
  if (taken) return { refused: `${nameOf(state, firstChapter)} already starts the part ${taken.name}` };
  return { events: [{ type: 'PartStarted', data: { partId, name: name.trim(), firstChapter } }] };
}

export function renamePart(history, { partId, name }) {
  const part = projectState(history).parts.find(p => p.id === partId);
  if (!part) return { refused: 'No such part' };
  if (!String(name || '').trim()) return { refused: 'Give the part a name' };
  if (part.name === name.trim()) return { nothing: true };
  return { events: [{ type: 'PartRenamed', data: { partId, name: name.trim() } }] };
}

export function removePart(history, { partId }) {
  if (!projectState(history).parts.some(p => p.id === partId)) return { refused: 'No such part' };
  return { events: [{ type: 'PartRemoved', data: { partId } }] };
}
