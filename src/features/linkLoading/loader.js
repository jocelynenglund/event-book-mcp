// ===========================================
// OPENING A LINK - The loader's controller. index.html draws the book and "Opening…" on the first paint (html.opening-link
// shows it); this says more when it knows (the book's name), says why when the link didn't open, and puts it away.
// ===========================================

import { linkLoadingState } from './linkLoadingState.read.js';
import { linkLoader } from './linkLoading.parts.js';

const root = () => document.documentElement;

// kind: 'share' | 'book'; name once known; problem when it didn't open: see linkLoadingState
export function drawLinkLoader(input) {
  const text = document.querySelector('#linkLoader .ll-text');
  if (!text) return;
  text.outerHTML = linkLoader(linkLoadingState(input));
  root().classList.add('opening-link');
}

// The link opened (or is shown on a card): the book you are opening is on the screen
export const closeLinkLoader = () => root().classList.remove('opening-link');

// "Back to my bookshelves" on a link that didn't open
export function initLinkLoader({ toBookshelves }) {
  document.getElementById('linkLoader')?.addEventListener('click', e => {
    if (!e.target.closest('[data-link-loader-back]')) return;
    closeLinkLoader();
    toBookshelves();
  });
}
