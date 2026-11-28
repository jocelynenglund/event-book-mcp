// ALTERNATE FLOWS - the feature's CSS (feature: alternate-flows)
// Kept in the feature's folder, not in styles.css, so removing the folder removes the look too. Added to the page once, when the sheet module loads.

const CSS = `
.af-ol-tag { display: inline-block; margin-left: 6px; padding: 0 7px; border: 1px solid var(--border); border-radius: 999px; color: var(--text-muted); font: 600 11px var(--font-body); }
`;

let added = false;
export function ensureAlternateFlowsStyles() {
  if (added || typeof document === 'undefined' || !document.head) return;
  added = true;
  const style = document.createElement('style');
  style.dataset.feature = 'alternate-flows';
  style.textContent = CSS;
  document.head.appendChild(style);
}
