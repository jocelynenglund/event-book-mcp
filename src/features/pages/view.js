// ===========================================
// PAGES - Screen (SV: Pages Storyboard)
// The journey's pages as phone-shaped cards in a row, in journey order, each with its screens as small windows labelled with their slice. Drag a card by
// its grip (or press the left and right arrow keys on it) to put it elsewhere in the journey (Arrange Pages); tap a page's title to rename it (Rename Page:
// onto a page that exists, they merge); ↗ goes to the screen's slice on the board. Reached from the top switch, or from a page chip on a board screen, which
// lights that page and the screen for a moment. The screen composes the part and reads no state itself: feed.js hands it the one replay of the book per
// draw. Where the focus is, what is being renamed and a drag in progress are this device's, not events.
// ===========================================

import { updateSaveChip } from '../sync/view.js';
import { pagesStoryboard as storyboard } from './pagesStoryboard.read.js';
import { pagesStoryboard as draw } from './pages.parts.js';
import { renamePage, arrangePages } from './pages.command.js';
import { render, showSliceOnBoard, showView } from '../../ui/feed.js';
import { pagesCss } from './pages.styles.js';
import { showToast } from '../../ui/toast.js';

const FLASH_MS = 1800;
let focus = null;      // { page, screenId }: lit for a moment after a chip sent us here
let renaming = null;   // the page whose title is being typed
let order = [];        // the pages as drawn, left to right

// A page (and the screen on it) to light when the Pages are drawn next; null for none
export function focusPages(to) {
  focus = to?.page ? { page: to.page, screenId: to.screenId || null } : null;
  renaming = null;
}

const view = () => document.getElementById('pagesView');
const cards = () => [...view().querySelectorAll('.pg-card')];
const say = refused => { if (refused) showToast(refused); return !refused; };

export function renderPages(state) {
  updateSaveChip();
  const box = view();
  if (!box) return;
  const rows = storyboard(state);
  order = rows.map(r => r.page);
  box.innerHTML = draw(rows, { renaming, highlight: focus });
  if (renaming) { const input = box.querySelector('.pg-title-input'); input?.focus(); input?.select(); }
  if (focus) {
    const lit = box.querySelector(`.pg-screen[data-highlight]`) || box.querySelector('.pg-card[data-highlight]');
    lit?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    const shown = focus;
    setTimeout(() => { if (focus === shown) focus = null; box.querySelectorAll('[data-highlight]').forEach(el => el.removeAttribute('data-highlight')); }, FLASH_MS);
  }
}

function commitRename(input) {
  const from = renaming, to = input.value;
  renaming = null;
  if (from && to.trim() !== from) say(renamePage({ from, to }));
  render();
}

// ---- Dragging a card by its grip: it follows the pointer, the others open a place for it; let go and it takes that place
let drag = null;   // { card, grip, pointerId, startX, from, to }

function dropPlace(x) {
  const others = cards().filter(c => c !== drag.card);
  return others.filter(c => { const r = c.getBoundingClientRect(); return r.left + r.width / 2 < x; }).length;
}

function markDrop() {
  const others = cards().filter(c => c !== drag.card);
  others.forEach((c, i) => { c.toggleAttribute('data-drop-before', i === drag.to); c.toggleAttribute('data-drop-after', i === others.length - 1 && drag.to >= others.length); });
}

function onDown(e) {
  const grip = e.target.closest('.pg-grip');
  if (!grip || (e.button != null && e.button !== 0)) return;
  const card = grip.closest('.pg-card'), from = cards().indexOf(card);
  drag = { card, grip, pointerId: e.pointerId, startX: e.clientX, from, to: from };
  grip.setPointerCapture?.(e.pointerId);
  card.setAttribute('data-dragging', 'true');
  e.preventDefault();
}

function onMove(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  drag.card.style.transform = `translateX(${e.clientX - drag.startX}px)`;
  drag.to = dropPlace(e.clientX);
  markDrop();
  const row = drag.card.closest('.pg-row'), box = row.getBoundingClientRect();
  if (e.clientX < box.left + 40) row.scrollLeft -= 14; else if (e.clientX > box.right - 40) row.scrollLeft += 14;
}

function endDrag(drop) {
  if (!drag) return;
  const { card, grip, pointerId, from, to } = drag;
  drag = null;
  try { grip.releasePointerCapture?.(pointerId); } catch { /* it was let go already */ }
  card.removeAttribute('data-dragging');
  card.style.transform = '';
  view().querySelectorAll('[data-drop-before], [data-drop-after]').forEach(c => { c.removeAttribute('data-drop-before'); c.removeAttribute('data-drop-after'); });
  if (!drop || to === from) return;
  const next = order.filter((_, i) => i !== from);
  next.splice(to, 0, order[from]);
  say(arrangePages({ order: next }));
  render();
}

// A card moved one place with the arrow keys (the grip is focused)
function onKey(e) {
  const grip = e.target.closest?.('.pg-grip');
  if (grip && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    const page = grip.closest('.pg-card').dataset.page, at = order.indexOf(page), to = at + (e.key === 'ArrowLeft' ? -1 : 1);
    e.preventDefault();
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    next.splice(at, 1);
    next.splice(to, 0, page);
    say(arrangePages({ order: next }));
    render();
    [...view().querySelectorAll('.pg-card')].find(c => c.dataset.page === page)?.querySelector('.pg-grip')?.focus();
  } else if (e.target.matches?.('.pg-title-input')) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(e.target); }
    else if (e.key === 'Escape') { e.preventDefault(); renaming = null; render(); }
  }
}

function initPages() {
  const box = view();
  if (!box) return;
  // A page chip on a board screen (pages.parts.js) opens the Pages on that page, with that screen lit
  document.addEventListener('click', e => {
    const chip = e.target.closest?.('[data-action="page-chip"]');
    if (chip) showView('pages', { page: chip.dataset.page, screenId: chip.dataset.el });
  });
  box.addEventListener('click', e => {
    const t = e.target.closest('[data-pages-action]');
    if (!t) return;
    if (t.dataset.pagesAction === 'rename') { renaming = t.dataset.page; render(); }
    else if (t.dataset.pagesAction === 'jump') showSliceOnBoard(t.dataset.slice);
  });
  box.addEventListener('pointerdown', onDown);
  box.addEventListener('pointermove', onMove);
  box.addEventListener('pointerup', () => endDrag(true));
  box.addEventListener('pointercancel', () => endDrag(false));
  box.addEventListener('keydown', onKey);
  box.addEventListener('focusout', e => { if (renaming && e.target.matches?.('.pg-title-input')) setTimeout(() => { if (renaming && !box.querySelector('.pg-title-input:focus')) commitRename(e.target); }, 0); });
}

// What ui/feed.js registerView takes: the switch button, the ☰ item, the screen's container, its styles
export const pagesView = { id: 'pages', label: 'Pages', menu: '▦ Pages', container: 'pagesView', render: renderPages, focus: focusPages, init: initPages, css: pagesCss };
