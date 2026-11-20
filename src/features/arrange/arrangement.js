// ===========================================
// ARRANGE - How the book's events lay its chapters out (pure, over the projection's state)
// state.chapterOrder is the order, left to right. state.parts is [{ id, name, firstChapter }] by place: a part
// is a name over the run of chapters from its first chapter up to the next part's first. state.arranged says
// someone has laid the chapters out (a build's snapshot then keeps that layout, matched by chapter name).
// ===========================================

const placeOf = (state, chapterId) => state.chapterOrder.indexOf(chapterId);

// Every part starts at a chapter the book has, no two at the same one, and they stand in the chapters' order
function settleParts(state) {
  const starts = new Set();
  state.parts = state.parts
    .filter(p => placeOf(state, p.firstChapter) >= 0 && !starts.has(p.firstChapter) && starts.add(p.firstChapter))
    .sort((a, b) => placeOf(state, a.firstChapter) - placeOf(state, b.firstChapter));
}

// ChapterMoved (old books): one chapter to a place
export function chapterMoved(state, { chapterId, toIndex }) {
  const from = placeOf(state, chapterId);
  if (from < 0) return;
  state.chapterOrder.splice(from, 1);
  state.chapterOrder.splice(Math.max(0, Math.min(toIndex, state.chapterOrder.length)), 0, chapterId);
  settleParts(state);
}

// ChaptersArranged: the order (chapters it leaves out go last, ones it names twice or doesn't have are ignored) and
// the part starts it names
export function chaptersArranged(state, { order = [], parts = [] }) {
  const listed = [...new Set(order)].filter(id => state.chapters[id]);
  state.chapterOrder = [...listed, ...state.chapterOrder.filter(id => !listed.includes(id))];
  parts.forEach(({ partId, firstChapter }) => {
    const part = state.parts.find(p => p.id === partId);
    if (part && state.chapters[firstChapter]) part.firstChapter = firstChapter;
  });
  state.arranged = true;
  settleParts(state);
}

export function partStarted(state, { partId, name, firstChapter }) {
  if (state.chapters[firstChapter] && !state.parts.some(p => p.id === partId)) state.parts.push({ id: partId, name, firstChapter });
  state.arranged = true;
  settleParts(state);
}

export function partRenamed(state, { partId, name }) {
  const part = state.parts.find(p => p.id === partId);
  if (part) part.name = name;
}

export function partRemoved(state, { partId }) {
  state.parts = state.parts.filter(p => p.id !== partId);
}

// A chapter goes: the part it started starts at the next chapter (or goes, if that one starts a part already)
export function chapterRemoved(state, chapterId) {
  const next = state.chapterOrder[placeOf(state, chapterId) + 1];
  state.parts = state.parts.flatMap(p => p.firstChapter !== chapterId ? [p]
    : next && !state.parts.some(q => q.firstChapter === next) ? [{ ...p, firstChapter: next }] : []);
}

// What a build's snapshot would take from the book: the layout in chapter names (the build brings its own chapter
// ids), or null when nobody laid the chapters out
export function layoutByName(state) {
  if (!state.arranged) return null;
  const name = id => state.chapters[id]?.name;
  return { names: state.chapterOrder.map(name), parts: state.parts.map(p => ({ id: p.id, name: p.name, at: placeOf(state, p.firstChapter) })) };
}

// The layout back onto a snapshot's chapters, matched by name: chapters the build lacks drop out, new ones go last
// (in no part); a part whose first chapter dropped out starts at the next one that stayed, if that is still its own
export function layoutOnSnapshot(state, layout) {
  const ids = new Map();
  state.chapterOrder.forEach(id => { const n = state.chapters[id]?.name; ids.set(n, [...(ids.get(n) || []), id]); });
  const mapped = layout.names.map(n => ids.get(n)?.shift() ?? null);
  const left = state.chapterOrder.filter(id => !mapped.includes(id));
  state.chapterOrder = [...mapped.filter(Boolean), ...left];
  state.parts = layout.parts.flatMap((p, i) => {
    const end = layout.parts[i + 1]?.at ?? mapped.length;
    const first = mapped.slice(p.at, end).find(Boolean);
    return first ? [{ id: p.id, name: p.name, firstChapter: first }] : [];
  });
  state.arranged = true;
  settleParts(state);
}
