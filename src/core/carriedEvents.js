// ===========================================
// CARRIED EVENTS - What a sticky takes with it when it is copied into another book (references/copy.js) or a built book's is adopted (editions/adopt.js)
// Each carrier: (the sticky as projected, its id in the other book) → [{ type, data }] (events to record there for it).
// ===========================================

import { carryScreenPages } from '../features/pages/pages.carry.js'; // feature: pages

const carriers = [
  carryScreenPages, // feature: pages
];

export const carriedEvents = (el, id) => carriers.flatMap(carry => carry(el, id));
