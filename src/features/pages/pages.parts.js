// ===========================================
// PAGES - The parts of the Pages screen and of the board's page chips, each drawn from its own view alone
// Pages storyboard (view: Pages Storyboard): the journey as a row of phone-shaped cards, one per page in journey order: its title (tap to rename), "N screens",
//   a grip to drag it to another place, and its screens stacked as small windows (the Pad's Screen wireframe) each labelled with its slice, with a ↗ to it on the
//   board. With no page named yet it says how to name one. `ui` is this device's: the page being renamed, and the page / screen to light for a moment.
// Screen page chips (view: Screen Page Chips): "on ‹Page›" for each page a screen sticky of the board sits on; a tap opens the Pages view there.
// Nothing here reads the book. A root carries data-component and data-key.
// ===========================================

import { screenWire } from '../pad/screenWire.parts.js';

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const screenBox = (s, ui, lit) => `
        <div class="pg-screen" data-screen="${escapeHtml(s.screenId)}"${lit && ui.highlight?.screenId === s.screenId ? ' data-highlight="true"' : ''}>
          ${screenWire(s.wire)}
          <div class="pg-screen-label">${s.slice
            ? `<span class="pg-slice"><span class="pg-slice-ref">${escapeHtml(s.slice.ref)}</span> ${escapeHtml(s.slice.title)}</span><button type="button" class="pg-jump" data-pages-action="jump" data-slice="${escapeHtml(s.slice.sliceId)}" aria-label="Go to ${escapeHtml(`${s.slice.ref} ${s.slice.title}`)} on the board" title="Show it on the board">↗</button>`
            : '<span class="pg-slice pg-slice-none">in no slice yet</span>'}</div>
        </div>`;

const pageCard = (row, ui) => {
  const renaming = ui.renaming === row.page, lit = ui.highlight?.page === row.page;
  return `
    <article class="pg-card" data-page="${escapeHtml(row.page)}" data-position="${row.position}"${lit ? ' data-highlight="true"' : ''}>
      <header class="pg-card-head">
        <button type="button" class="pg-grip" data-pages-action="grip" aria-label="Move ${escapeHtml(row.page)}: drag it, or use the left and right arrow keys" title="Drag to put it elsewhere in the journey">⠿</button>
        <div class="pg-card-title">${renaming
          ? `<input class="pg-title-input" data-pages-input value="${escapeHtml(row.page)}" aria-label="Page name" maxlength="60" spellcheck="false" autocomplete="off">`
          : `<button type="button" class="pg-title" data-pages-action="rename" data-page="${escapeHtml(row.page)}" title="Tap to rename the page">${escapeHtml(row.page)}</button>`}
          <span class="pg-count">${plural(row.screens.length, 'screen', 'screens')}</span></div>
      </header>
      <div class="pg-screens">${row.screens.map(s => screenBox(s, ui, lit)).join('')}</div>
    </article>`;
};

export function pagesStoryboard(rows, ui = {}) {
  const mark = 'data-component="Pages storyboard" data-key="pages"';
  if (!rows.length) return `<div class="pg" ${mark}><p class="pg-empty">No pages yet: add <code>on: Page name</code> to a screen note on the Pad, or Edit as text on a board screen.</p></div>`;
  return `<div class="pg" ${mark}><div class="pg-row">${rows.map(r => pageCard(r, ui)).join('')}</div></div>`;
}

export function screenPageChips(view) {
  if (!view.pages.length) return '';
  return `<span class="bd-page-chips" data-component="Screen page chips" data-key="${escapeHtml(view.screenId)}">${view.pages.map(p =>
    `<span class="bd-page-chip" role="button" tabindex="0" data-action="page-chip" data-page="${escapeHtml(p)}" data-el="${escapeHtml(view.screenId)}" title="Show ${escapeHtml(p)} on the Pages view">on ${escapeHtml(p)}</span>`).join('')}</span>`;
}
