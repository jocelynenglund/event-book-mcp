// ===========================================
// PAGES - Suggestions after `on:` on a Pad screen note (pure; the Pad's suggestion machinery calls these)
//   pageContext: "on: Basket page, Chec" asks for a page, after the last comma
//   pageSuggestions: the book's pages and the ones other screen notes name (not this note's own line), minus the ones the line has already
// ===========================================

import { parseScreen } from '../pad/padScreen.rules.js';
import { journeyOf, pageKey } from './pages.rules.js';

const ON = /^\s*on\s*:/i;

export function pageContext(before) {
  const on = before.match(ON);
  return on ? { kind: 'page', skip: on[0].length + before.slice(on[0].length).lastIndexOf(',') + 1 } : null;
}

export function pageSuggestions(state, { text, caret, noteId }) {
  const line = text.slice(0, caret).slice(text.lastIndexOf('\n', caret - 1) + 1);
  const have = new Set(line.replace(ON, '').split(',').slice(0, -1).map(pageKey));
  const known = new Map(journeyOf(state).map(p => [p.key, p.page]));
  Object.values(state.pad?.notes || {}).filter(n => n.colour === 'screen' && n.id !== noteId)
    .forEach(n => (parseScreen(n.text).pages || []).forEach(p => known.has(pageKey(p)) || known.set(pageKey(p), p)));
  return [...known].filter(([k]) => !have.has(k)).map(([, name]) => name);
}
