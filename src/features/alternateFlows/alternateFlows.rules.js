// ALTERNATE FLOWS - Shared pure rules
// An alternate ending ("alternate of S5", Clone slice / Split into endings) lives in a flow of its chapter, named after its ending.
import { chapterFlows } from '../../core/projections.js';
import { alternateRoot } from '../cloneSlice/cloneSlice.rules.js';

const tidy = s => String(s ?? '').replace(/\s+/g, ' ').trim();

// The flow's name: what the alternate's name says after its colon ("Send the capture: it fails" → "it fails"), else the ending event's name.
// A name's last parenthesis ("Send the capture (Capture Declined)") is the ending event, so it is not read as a suffix.
export function flowNameFor(sliceName, endingName) {
  const name = tidy(sliceName);
  const at = name.lastIndexOf(': ');
  const suffix = at >= 0 ? tidy(name.slice(at + 2)) : '';
  return suffix && !/[()]/.test(suffix) ? suffix : tidy(endingName);
}

// The flow an alternate of `originalId` goes in, if its chapter has one already: the flow another alternate of the same slice is in,
// else a flow of that name (case-insensitive). null: make one.
export function existingFlowFor(state, chapterId, originalId, name) {
  const flows = chapterFlows(chapterId, state);
  const sibling = Object.values(state.slices).find(s => s.alternateOf === originalId && s.chapterId === chapterId && flows.some(f => f.id === s.flowId));
  if (sibling) return sibling.flowId;
  return flows.find(f => f.name.toLowerCase() === name.toLowerCase())?.id || null;
}

// An alternate with a chapter, an original that is still there, and no flow yet
export const needsFlow = (state, s) => !!(s.alternateOf && state.slices[s.alternateOf] && s.chapterId && state.chapters[s.chapterId] && !s.flowId);

// The name an existing alternate's flow gets: from its name, else its first outcome event; '' when it has neither
export function flowNameOf(state, slice) {
  const ending = slice.elements.map(id => state.elements[id]).find(e => e?.type === 'event')?.name;
  return flowNameFor(slice.name, ending);
}

// The slices a flow's view steps past: an original whose alternate is in this flow (the alternate takes its place in the story)
// (the main-line slice it stands in for: alternateOf followed to its end, so a chain of alternates replaces the happy case too)
export const replacedInFlow = (state, flow) => flow
  ? new Set(Object.values(state.slices).filter(s => s.alternateOf && s.flowId === flow.id && s.chapterId === flow.chapterId).map(s => alternateRoot(state, s.id)))
  : new Set();
