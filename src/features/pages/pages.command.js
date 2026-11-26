// ===========================================
// PAGES - Commands
// A screen sticky says which pages of the journey it sits on; a page exists by being named. Each returns null when it recorded what it should (or
// there was nothing to change), else why it was refused. Pages are a drawing of the journey: they do not clear Refined.
// SC: Place Screen On Pages — the screen's whole list each time: fewer pages takes it off a page, [] off every page. Names are tidied (trimmed, blanks
//     and repeats dropped); the same pages again records nothing. Only a screen sits on a page. Sources: a Pad screen note's `on:` line (Make chapter,
//     Update chapter: pad/screenSketch.command.js) and the board's Edit as text (Save Screen Text).
// SC: Rename Page — every screen on the page moves to the new name; onto a page that exists they merge. A screen's sketch keeps its `on:` line true.
// SC: Arrange Pages — the journey order; pages left out come after, by name. A page no screen is on can't be named.
// ===========================================

import { appendEvent, EventTypes, canEditCurrent } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { tidyPages, samePages, pageKey, journeyOf, renamedIn } from './pages.rules.js';
import { parseScreen } from '../pad/padScreen.rules.js';
import { withPages } from './screenOn.rules.js';
import { PagesEvents } from './pages.events.js';

const KIND = { command: 'command', event: 'event', readModel: 'read model', processor: 'automation' };
const READ_ONLY = 'Read only: check the book out to change its pages';
const record = (type, data) => (appendEvent(type, data) ? null : READ_ONLY);

export function placeScreenOnPages(screenId, pages) {
  if (!canEditCurrent()) return READ_ONLY;
  const el = projectState().elements[screenId];
  if (!el) return 'No such screen';
  if (el.type !== 'screen') return `${el.name} is a ${KIND[el.type] || el.type}, not a screen: only screens sit on pages`;
  const next = tidyPages(pages);
  if (samePages(el.pages || [], next)) return null;
  return record(PagesEvents.ScreenPagesSet, { screenId, pages: next });
}

// After a screen's sketch changed (pad/screenSketch.command.js): when its `on:` line changed, the text says which pages the screen sits on (a page
// renamed, or a screen put on a page from elsewhere, stays as it is while the line does)
export function placeFromSketch(elementId, was, now) {
  const pages = parseScreen(now).pages || [];
  return samePages(parseScreen(was).pages || [], pages) ? null : placeScreenOnPages(elementId, pages);
}

// { from, to } -> why it was refused, or null
export function renamePage({ from, to } = {}) {
  if (!canEditCurrent()) return READ_ONLY;
  const name = tidyPages([to])[0];
  if (!name) return 'A page needs a name';
  const journey = journeyOf(projectState()), page = journey.find(p => p.key === pageKey(from));
  if (!page) return `No screen is on ${tidyPages([from])[0] || String(from ?? '').trim()}`;
  // Onto a page that exists, the name that page has; otherwise the name as typed
  const onto = journey.find(p => p.key === pageKey(name) && p !== page), now = onto ? onto.page : name;
  if (now === page.page) return null;
  const refused = record(PagesEvents.PageRenamed, { from: page.page, to: now });
  if (refused) return refused;
  // The screens' `on:` lines say the new name too, so that saving their text does not take the page back
  const after = projectState();
  page.screenIds.map(id => after.elements[id]).filter(e => e?.sketch && (parseScreen(e.sketch).pages || []).some(p => pageKey(p) === pageKey(page.page))).forEach(e => {
    const text = withPages(e.sketch, renamedIn(parseScreen(e.sketch).pages || [], page.page, now));
    if (text !== e.sketch) appendEvent(EventTypes.ScreenSketchSet, { elementId: e.id, text });
  });
  return null;
}

// { order } -> why it was refused, or null
export function arrangePages({ order } = {}) {
  if (!canEditCurrent()) return READ_ONLY;
  const journey = journeyOf(projectState()), names = tidyPages(order);
  const unknown = names.find(n => !journey.some(p => p.key === pageKey(n)));
  if (unknown) return `No screen is on ${unknown}`;
  const named = names.map(n => journey.find(p => p.key === pageKey(n)).page);
  const rest = journey.filter(p => !named.some(n => pageKey(n) === p.key)).sort((a, b) => a.key.localeCompare(b.key)).map(p => p.page);
  if (samePages([...named, ...rest], journey.map(p => p.page))) return null;
  return record(PagesEvents.PagesArranged, { order: named });
}
