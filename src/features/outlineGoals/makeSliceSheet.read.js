// OUTLINE GOALS - View: Make Slice Sheet (feature: outline-goals)
// The little sheet that turns a draft event into a slice: which command makes it happen, and its fields. The fields the event
// already carries are prefilled, so nothing is typed twice.
import { chapterIdOf, sameName } from './rules.js';

const named = (state, type, name) => Object.values(state.elements).find(e => e.type === type && sameName(e.name, name));

export function makeSliceSheet(state, chapterId, event) {
  const id = chapterIdOf(state, chapterId);
  if (!id) return null;
  const el = named(state, 'event', event);
  return { chapterId: id, chapterName: state.chapters[id].name, event: String(event).trim(), command: '', fields: (el?.properties || []).map(p => p.name).join(', ') };
}
