// ===========================================
// ARRANGE - Arrange Slots (SV: Arrange Slots)
// Where a chapter, or a whole part, can be put down on the shelf, left to right. A slot is
// { before: the chapter it lands before (null: the end), startsPart: the part it would become the first chapter of,
//   beforePart: the part whose tab it lands before }. A chapter that starts a part with others after it leaves the
// part to them; one that is alone in its part takes the part along (its tab is no slot).
// ===========================================

const none = { startsPart: null, beforePart: null };

// The part starts as they stand once chapterId is lifted out: first chapter → part
export function startsWithout(state, chapterId) {
  const starts = new Map(state.parts.map(p => [p.firstChapter, p]));
  const own = starts.get(chapterId);
  if (!own) return { starts, carries: null };
  starts.delete(chapterId);
  const next = state.chapterOrder[state.chapterOrder.indexOf(chapterId) + 1];
  if (next && !starts.has(next)) { starts.set(next, own); return { starts, carries: null }; }
  return { starts, carries: own };
}

export function chapterSlots(state, chapterId) {
  const { starts } = startsWithout(state, chapterId);
  const slots = state.chapterOrder.filter(id => id !== chapterId).flatMap(id => {
    const part = starts.get(id);
    return part ? [{ before: id, ...none, beforePart: part.id }, { before: id, ...none, startsPart: part.id }] : [{ before: id, ...none }];
  });
  return [...slots, { before: null, ...none }];
}

// A part goes between parts, never into the middle of one
export function partSlots(state, partId) {
  const others = state.parts.filter(p => p.id !== partId).map(p => ({ before: p.firstChapter, ...none, beforePart: p.id }));
  return [...others, { before: null, ...none }];
}

// Either: kind is what the shelf's data-drag says, "chapter" or "part"
export const arrangeSlots = (state, kind, id) => kind === 'part' ? partSlots(state, id) : chapterSlots(state, id);
