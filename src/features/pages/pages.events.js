// The events of the Pages feature (this folder is the whole feature: see README.md)
export const PagesEvents = {
  ScreenPagesSet: 'ScreenPagesSet',   // the pages of the journey a screen sticky sits on, the whole list each time ([] takes it off every page); a page exists by being named { screenId, pages }
  PageRenamed: 'PageRenamed',         // a page gets a new name: every screen on it moves; onto an existing page it merges { from, to }
  PagesArranged: 'PagesArranged'      // the pages in journey order; the pages left out come after, by name { order }
};
