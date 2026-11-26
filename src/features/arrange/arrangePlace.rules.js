// ===========================================
// ARRANGE - Placing (pure over the book's state): where a drop, a step or a move into a part leaves the chapter
// order and the part starts, as the input of Arrange Chapters: { order, parts: [{ partId, firstChapter }] }.
// ===========================================

import { chapterSlots, startsWithout } from './arrangeSlots.read.js';

const partsOf = (state, firsts = new Map(state.parts.map(p => [p.id, p.firstChapter]))) =>
  state.parts.map(p => ({ partId: p.id, firstChapter: firsts.get(p.id) }));

// Put the chapter down at a slot
export function placeChapter(state, chapterId, slot) {
  const { starts, carries } = startsWithout(state, chapterId);
  const firsts = new Map(state.parts.map(p => [p.id, p.firstChapter]));
  starts.forEach((part, first) => firsts.set(part.id, first));
  if (carries) firsts.set(carries.id, chapterId);
  if (slot.startsPart) firsts.set(slot.startsPart, chapterId);
  const order = state.chapterOrder.filter(id => id !== chapterId);
  order.splice(slot.before == null ? order.length : order.indexOf(slot.before), 0, chapterId);
  return { order, parts: partsOf(state, firsts) };
}

// Put a whole part (its chapters, up to the next part) down between parts
export function placePart(state, partId, slot) {
  const at = state.chapterOrder.indexOf(state.parts.find(p => p.id === partId)?.firstChapter);
  if (at < 0) return null;
  const next = state.parts.find(p => state.chapterOrder.indexOf(p.firstChapter) > at);
  const block = state.chapterOrder.slice(at, next ? state.chapterOrder.indexOf(next.firstChapter) : undefined);
  const order = state.chapterOrder.filter(id => !block.includes(id));
  order.splice(slot.before == null ? order.length : order.indexOf(slot.before), 0, ...block);
  return { order, parts: partsOf(state) };
}

const sameLayout = (a, b) => a.order.join() === b.order.join() && a.parts.map(p => p.firstChapter).join() === b.parts.map(p => p.firstChapter).join();
const layoutNow = state => ({ order: state.chapterOrder, parts: partsOf(state) });

// One place earlier (-1) or later (+1) among the chapters and the part tabs; null at the ends
export function stepChapter(state, chapterId, by) {
  const slots = chapterSlots(state, chapterId);
  const now = slots.findIndex(s => sameLayout(placeChapter(state, chapterId, s), layoutNow(state)));
  return now < 0 || !slots[now + by] ? null : placeChapter(state, chapterId, slots[now + by]);
}

// At the end of a part, wherever the chapter is now
export function moveIntoPart(state, chapterId, partId) {
  const slots = chapterSlots(state, chapterId);
  const after = state.parts[state.parts.findIndex(p => p.id === partId) + 1];
  const slot = after ? slots.find(s => s.beforePart === after.id) : slots[slots.length - 1];
  return slot ? placeChapter(state, chapterId, slot) : null;
}
