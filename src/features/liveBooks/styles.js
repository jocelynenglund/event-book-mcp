// LIVE BOOKS - the feature's CSS (feature: live-books)
// Kept in the feature's folder, not in styles.css, so removing the folder removes the look too. Added to the page once.
// On phones only a small dot shows (the words stay in aria-label).

const CSS = `
.lvb-chip { display: inline-flex; align-items: center; gap: 4px; flex: none; }
.lvb-chip[data-state="live"] .lvb-icon { color: #1a8f4a; }
.lvb-chip[data-state="reconnecting"] .lvb-icon { display: inline-block; animation: lvb-spin 1.2s linear infinite; }
.lvb-chip[data-state="polling"] { color: var(--text-muted); }
@keyframes lvb-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .lvb-chip[data-state="reconnecting"] .lvb-icon { animation: none; } }
/* A phone's header has no room for another chip: the dot is a badge on the corner of the save chip beside it. Its width and negative
   margins cancel the header's 8 px gap, so it takes no room; its hit area is a little larger than the dot. */
@media (max-width: 600px) {
  body:not(.library-mode) .header .lvb-chip { position: relative; z-index: 1; flex: none; width: 8px; min-width: 0; margin: 0 -8px; padding: 0; border: 0; background: none; overflow: visible; font-size: 9px; line-height: 1; justify-content: center; }
  body:not(.library-mode) .header .lvb-chip::after { content: ''; position: absolute; inset: -8px -6px; }
  body:not(.library-mode) .header .lvb-chip .lvb-text { display: none; }
}
`;

export function addLiveBooksStyles() {
  if (document.getElementById('lbStyles')) return;
  const el = document.createElement('style');
  el.id = 'lbStyles';
  el.textContent = CSS;
  document.head.appendChild(el);
}
