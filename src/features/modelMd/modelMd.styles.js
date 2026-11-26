// MODEL.MD - the feature's CSS (feature: model-md)
// Kept in the feature's folder, not in styles.css, so removing the folder removes the look too. Added to the page once.

const CSS = `
.mm-section { margin: 10px 0; }
.mm-group { margin: 6px 0 10px; }
.mm-gap { margin: 2px 0 2px 12px; color: var(--text-muted); font: 400 13px var(--font-body); overflow-wrap: anywhere; }
.mm-slice { font-weight: 700; }
.mm-line { margin: 6px 0; color: var(--text-muted); font: 400 13px var(--font-body); }
.mm-clean { margin: 10px 0; font: 500 14px var(--font-body); }
.mm-paste .mm-file { display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px; cursor: pointer; }
.mm-paste textarea { width: 100%; box-sizing: border-box; font-family: var(--font-mono, monospace); font-size: 13px; }
`;

let added = false;
export function ensureModelMdStyles() {
  if (added || typeof document === 'undefined' || !document.head) return;
  added = true;
  const style = document.createElement('style');
  style.dataset.feature = 'model-md';
  style.textContent = CSS;
  document.head.appendChild(style);
}
