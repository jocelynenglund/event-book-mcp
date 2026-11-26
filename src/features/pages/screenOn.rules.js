// ===========================================
// PAGES - The `on:` line of a screen's text (pure)
//   Basket
//   [ Selected ] ( Add )
//   on: Basket page, Checkout       the pages of the journey the screen sits on (any case, with or without a space before the colon)
// It is not a part of the window: pad/padScreen.rules.js hands every line to readOn (a line reader), which takes this one and says the pages.
// ===========================================

import { tidyPages } from './pages.rules.js';

const ON = /^on\s*:/i;

// A line reader for parseScreen: true when the line is an `on:` line (its pages are added to `found.pages`, tidied)
export function readOn(line, found) {
  if (!ON.test(line)) return false;
  found.pages = tidyPages([...(found.pages || []), ...line.replace(ON, '').split(',')]);
  return true;
}

// The text with its `on:` line(s) saying `pages` (one line, where the first was, else at the end; none when there are no pages), the rest as typed
export function withPages(text, pages) {
  const names = tidyPages(pages), out = [];
  let put = false;
  String(text ?? '').split(/\r?\n/).forEach(line => {
    if (!ON.test(line.trim())) { out.push(line); return; }
    if (!put && names.length) out.push(`on: ${names.join(', ')}`);
    put = true;
  });
  while (out.length && !out[out.length - 1].trim()) out.pop();
  if (!put && names.length) out.push(`on: ${names.join(', ')}`);
  return out.join('\n');
}

// What the window says under it when seen on its own (not from a slice): a small line of the pages (a wireframe extra)
export function pagesNote(screen, focus) {
  return !focus && screen.pages?.length ? { notes: [{ kind: 'on', text: `on ${screen.pages.join(' · ')}` }] } : {};
}
