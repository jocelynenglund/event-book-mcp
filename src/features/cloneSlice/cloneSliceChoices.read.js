// CLONE SLICE - Clone Slice Choices (SV)
// What the Clone slice sheet asks: the clone's name (prefilled "‹slice› (alternate)"), which stickies it keeps (reused, not copied: screen and
// command, or for a view read model and screen, on by default; events and scenarios off), and whether it may have an ending (a change only).
// With a scenario ("Give this its own ending") nothing is asked of what to keep: the scenario moves into the clone, which keeps screen and
// command. null when the slice (or the scenario) is gone, or the slice is no one that can be cloned.
// -> { sliceId, scenarioId, mode: 'slice' | 'scenario', title, scenarioName, name, keeps: [{ key, label, on }], canEnd }
import { projectState, getScenariosForSlice, sliceTitle } from '../../core/projections.js';
import { cloneable, keepKinds, nameFor, defaultKeep } from './cloneSlice.rules.js';

export function cloneSliceChoices(book, sliceId, scenarioId = null) {
  const slice = book.slices[sliceId];
  if (!cloneable(slice, sliceId)) return null;
  const scn = scenarioId ? book.scenarios[scenarioId] : null;
  if (scenarioId && (!scn || scn.sliceId !== sliceId)) return null;
  const has = key => key === 'events' ? slice.elements.some(id => book.elements[id]?.type === 'event') : slice.elements.some(id => book.elements[id]?.type === key);
  const scenarios = getScenariosForSlice(sliceId, book).length;
  const keeps = scn ? [] : [...keepKinds(slice.type).filter(([key]) => has(key)).map(([key, label]) => ({ key, label, on: !!defaultKeep[key] })),
    ...(scenarios ? [{ key: 'scenarios', label: `scenarios (${scenarios})`, on: false }] : [])];
  return { sliceId, scenarioId: scn ? scenarioId : null, mode: scn ? 'scenario' : 'slice', title: sliceTitle(slice, book), scenarioName: scn?.name || '',
    name: nameFor(slice, book), keeps, canEnd: slice.type === 'SC' };
}

// The same, for the book as it stands (the sheet reads nothing of the book itself)
export const cloneSliceChoicesNow = (sliceId, scenarioId = null) => cloneSliceChoices(projectState(), sliceId, scenarioId);
