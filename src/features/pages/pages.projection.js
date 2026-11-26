// ===========================================
// PAGES - What the book's events say about pages (called by core/projections.js once per event, after its own handling)
// state.elements[screen].pages: the pages a screen sits on; state.pageOrder: the journey's order, by name. A book without these events has neither
// (journeyOf reads a missing pageOrder as empty), and a build without this feature ignores the events: nothing else reads them.
// ===========================================

import { PagesEvents as E } from './pages.events.js';
import { tidyPages, renamedIn } from './pages.rules.js';

export function projectPages(state, event) {
  switch (event.type) {
    case 'ModelSnapshot':   // a whole book in one event: the order comes along (the screens' pages are in its elements)
      if (event.data?.state?.pageOrder) state.pageOrder = tidyPages(event.data.state.pageOrder);
      break;
    case E.ScreenPagesSet: {
      const screen = state.elements[event.data.screenId], pages = tidyPages(event.data.pages);
      if (screen?.type === 'screen') { if (pages.length) screen.pages = pages; else delete screen.pages; }
      break;
    }
    case E.PageRenamed:
      Object.values(state.elements).filter(e => e.pages?.length).forEach(e => { e.pages = renamedIn(e.pages, event.data.from, event.data.to); });
      state.pageOrder = renamedIn(state.pageOrder, event.data.from, event.data.to);
      break;
    case E.PagesArranged:
      state.pageOrder = tidyPages(event.data.order);
      break;
    default:
  }
}
