// A screen copied into another book (or a built book's adopted) keeps the pages it sits on (see core/carriedEvents.js)
import { PagesEvents } from './pages.events.js';

export const carryScreenPages = (el, id) => el.pages?.length ? [{ type: PagesEvents.ScreenPagesSet, data: { screenId: id, pages: el.pages } }] : [];
