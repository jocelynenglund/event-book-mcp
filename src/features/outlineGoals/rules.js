// ===========================================
// OUTLINE GOALS - Rules the commands and the views share (feature: outline-goals)
// Pure: they read the projected state (state.outlineGoals is this feature's corner of it).
// ===========================================

const EMPTY = Object.freeze({ criteria: {}, order: [], descriptions: {}, drafts: {} });
export const goalsOf = state => state.outlineGoals || EMPTY;

export const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
export const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

// The ladder of a chapter, lowest rung first
export const RUNGS = ['described', 'criteria', 'events', 'slices', 'scenarios', 'refined', 'built'];

// A chapter named by its id or, failing that, by its name (any case): its id, or null
export function chapterIdOf(state, ref) {
  const text = String(ref ?? '').trim();
  if (state.chapters[text]) return text;
  return Object.values(state.chapters).find(c => sameName(c.name, text))?.id || null;
}

// The criteria still in the book, in the order they were added
export const activeCriteria = state => {
  const goals = goalsOf(state);
  return goals.order.map(id => goals.criteria[id]).filter(c => c && !c.removed);
};

// A scenario proves a criterion while it exists and is a must have
export const isProof = (state, scenarioId) => !!state.scenarios[scenarioId]?.mustHave;
export const provingScenarios = (state, criterion) => criterion.proofs.filter(id => isProof(state, id)).map(id => state.scenarios[id]);
export const isProven = (state, criterion) => provingScenarios(state, criterion).length > 0;

// The chapters a criterion is tagged to that the book still has
export const taggedChapters = (state, criterion) => criterion.chapters.filter(id => state.chapters[id]).map(id => state.chapters[id]);

export const slicesOf = (state, chapterId) => Object.values(state.slices).filter(s => s.chapterId === chapterId);

// Event names held by slices of a chapter (any case)
const heldEvents = (state, chapterId) => slicesOf(state, chapterId)
  .flatMap(s => s.elements.map(id => state.elements[id])).filter(el => el?.type === 'event').map(el => el.name);

// A chapter's drafts a slice has not taken in yet (a slice of the chapter holding an event of that name takes it in)
export function openDrafts(state, chapterId) {
  const held = heldEvents(state, chapterId);
  return (goalsOf(state).drafts[chapterId] || []).filter(name => !held.some(h => sameName(h, name)));
}

// The furthest rung a chapter has reached (each rung asks only about itself), or 'none'
export function reachedRung(state, chapterId) {
  const slices = slicesOf(state, chapterId);
  const ids = new Set(slices.map(s => s.id));
  const reached = {
    described: !!String(goalsOf(state).descriptions[chapterId] || '').trim(),
    criteria: activeCriteria(state).some(c => c.chapters.includes(chapterId)),
    events: (goalsOf(state).drafts[chapterId] || []).length > 0 || heldEvents(state, chapterId).length > 0,
    slices: slices.length > 0,
    scenarios: Object.values(state.scenarios).some(s => ids.has(s.sliceId)),
    refined: slices.length > 0 && slices.every(s => s.refined),
    built: slices.length > 0 && slices.every(s => s.built)
  };
  return [...RUNGS].reverse().find(r => reached[r]) || 'none';
}
