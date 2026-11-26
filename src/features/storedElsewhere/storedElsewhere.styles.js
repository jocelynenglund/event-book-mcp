// STORED ELSEWHERE - the feature's own CSS (feature: stored-elsewhere)
// The brown look of a stored-elsewhere sticky is the old legacy-table look and lives in styles.css (data-stored); this is the sheet and the Pad tag.
// Added to the page once, when the sheet module loads.

const CSS = `
.se-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px; }
.se-chip { min-height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface-hover); color: var(--text); font: 600 13px var(--font-body); cursor: pointer; }
.se-chip[data-recent="true"] { border-color: #c99a6c; }
.se-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.se-tag { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 4px; background: rgba(60, 30, 8, .8); color: #ffe3c2; font: 800 9px var(--font-mono); letter-spacing: .08em; vertical-align: middle; }
.pad-note[data-stored] { background: #c99a6c; color: #2a1606; box-shadow: inset 0 0 0 1.5px rgba(60, 30, 8, .35); }
`;

let added = false;
export function ensureStoredElsewhereStyles() {
  if (added || typeof document === 'undefined' || !document.head) return;
  added = true;
  const style = document.createElement('style');
  style.dataset.feature = 'stored-elsewhere';
  style.textContent = CSS;
  document.head.appendChild(style);
}
