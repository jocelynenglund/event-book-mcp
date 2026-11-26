// ===========================================
// PAD - Screen sketch
// SC: Set Screen Sketch — a screen sticky keeps the wireframe text a Pad screen note was typed with (ScreenSketchSet), so the board and the
//     slice page can draw it. The same text again records nothing. It is a drawing, not the model: it does not clear Refined.
// SC: Place Screens — Make chapter / Update chapter put each screen on a slice: the one screen sticky of that name (a screen is ONE sticky
//     in every slice it appears in), added to the slice when it is not there, then given its sketch.
// SC: Save Screen Text — the board's screen editor: the text typed for a screen sticky is its sketch (as above), its first line is the screen's name (the sticky is
//     renamed to it), and its inputs and the fields it shows are mapped (screenMappings.command.js: Map Screen Fields), as when Make chapter placed it.
// Each returns null when it recorded what it should (or there was nothing to change), else why it was refused.
// ===========================================

import { appendEvent, EventTypes, canEditCurrent } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { addToSlice } from '../board/command.js';
import { stickyNamed } from '../planFile/build.js';
import { parseScreen } from './padScreen.rules.js';
import { mapScreenFields } from './screenMappings.command.js';
import { placeFromSketch } from '../pages/pages.command.js'; // feature: pages

// What other features do once a screen has a new sketch: (elementId, the sketch before, the sketch now) → why it was refused, or null
const afterSketchSet = [
  placeFromSketch, // feature: pages
];

const lower = s => String(s ?? '').trim().toLowerCase();

export function setScreenSketch(elementId, text) {
  const el = projectState().elements[elementId];
  if (el?.type !== 'screen') return 'Only a screen has a sketch';
  if (!canEditCurrent()) return 'Read only: check the book out to sketch a screen';
  const next = String(text ?? '');
  if ((el.sketch || '') === next) return null;
  if (!appendEvent(EventTypes.ScreenSketchSet, { elementId, text: next })) return 'Read only: check the book out to sketch a screen';
  return afterSketchSet.map(after => after(elementId, el.sketch || '', next)).find(Boolean) || null;
}

// screens: [{ name, text }]. -> why it was refused, or null
export function placeScreens(sliceId, screens) {
  for (const { name, text } of screens) {
    const slice = projectState().slices[sliceId];
    const here = slice.elements.map(id => projectState().elements[id]).find(e => e?.type === 'screen' && lower(e.name) === lower(name));
    const refused = setScreenSketch(here ? here.id : addToSlice(sliceId, 'screen', stickyNamed('screen', name)), text);
    if (refused) return refused;
  }
  return null;
}

export function saveScreenText(elementId, text) {
  const refused = setScreenSketch(elementId, text);
  if (refused) return refused;
  const el = projectState().elements[elementId], name = parseScreen(text).name;
  if (name && lower(name) !== lower(el.name)) appendEvent(EventTypes.ElementRenamed, { elementId, name });
  return mapScreenFields(elementId);
}
