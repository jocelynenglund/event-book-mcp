// ===========================================
// PAGES - Pages Storyboard (SV)
// The journey drawn: each page in journey order (the order Arrange Pages set; pages left out come after, by name) with its screens. A screen is
// told by its name, its sketch (as typed: the Pad's screen notation) drawn as a small window, and the first slice of the board it sits in (its S-number
// and title, to jump to), or none when it is on no slice. A page's screens are in board order (by that slice), then by name. A page with no screen
// on it is not a page: it is not listed. A screen with no sketch is drawn as an empty window named after it.
// -> [{ page, position (1, 2, …), screens: [{ screenId, name, sketch, wire: { key, title, empty, lines }, slice: { sliceId, ref, title } | null }] }]
// ===========================================

import { getOrderedSlices, sliceRef, sliceTitle } from '../../core/projections.js';
import { wireframe } from '../pad/padScreen.rules.js';
import { journeyOf } from './pages.rules.js';

export function pagesStoryboard(state) {
  const slices = getOrderedSlices(state);
  const firstSlice = id => slices.find(s => s.elements.includes(id));
  const screen = (id, pageKey) => {
    const el = state.elements[id], slice = firstSlice(id);
    return {
      screenId: id, name: el.name, sketch: el.sketch || '',
      wire: { key: `${pageKey}:${id}`, ...wireframe(el.sketch || el.name, { commands: [], readModels: [] }) },
      slice: slice ? { sliceId: slice.id, ref: sliceRef(state, slice.id), title: sliceTitle(slice, state) } : null
    };
  };
  const order = s => { const at = firstSlice(s.screenId); return at ? slices.indexOf(at) : slices.length; };
  return journeyOf(state).map((p, i) => ({
    page: p.page, position: i + 1,
    screens: p.screenIds.map(id => screen(id, p.key)).sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name))
  }));
}
