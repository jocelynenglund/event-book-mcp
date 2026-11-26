// ===========================================
// PAGES - Screen Page Chips (SV)
// The chips on a screen sticky of the board: the pages it sits on, named as the book names them (a page renamed is renamed here) and in journey order.
// -> { screenId, pages: [name] } ([] for a screen on no page, or a sticky that is not a screen)
// ===========================================

import { journeyOf, pageKey } from './pages.rules.js';

export function screenPageChips(state, screenId) {
  const el = state.elements[screenId], mine = new Set((el?.type === 'screen' ? el.pages || [] : []).map(pageKey));
  return { screenId, pages: journeyOf(state).filter(p => mine.has(p.key)).map(p => p.page) };
}

// The chips as a board sticky's extra (board/boardLaneStickies.read.js): none for a sticky with no page
export function screenPageChipsExtra(state, el) {
  const view = screenPageChips(state, el.id);
  return view.pages.length ? { kind: 'pageChips', view } : null;
}
