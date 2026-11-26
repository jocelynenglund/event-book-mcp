// CLONE SLICE - the feature's CSS (feature: clone-slice)
// Kept in the feature's folder, not in styles.css, so removing the folder removes the look too. Added to the page once, when the sheet
// module loads. Colours come from the app's tokens.

const CSS = `
.cs-alt { display: inline-flex; align-items: center; gap: 5px; margin: 0 0 4px; padding: 2px 8px 2px 4px; border: 1px dashed var(--border); border-radius: 999px; background: var(--surface-hover); color: var(--text-muted); font: 600 11px var(--font-body); cursor: pointer; }
.cs-alt b { padding: 0 5px; border-radius: 999px; background: var(--text-muted); color: var(--bg); font-weight: 800; letter-spacing: .04em; }
.cs-endings { display: inline-block; margin: 0 0 4px; padding: 1px 8px; border-bottom: 2px solid var(--text-muted); color: var(--text-muted); font: 700 11px var(--font-body); letter-spacing: .03em; }
.bd-head-extras { display: flex; flex-wrap: wrap; gap: 4px; }
.ol-item:has(.cs-ol-note) { margin-left: 22px; border-left: 2px dashed var(--border); }
.cs-ol-note { display: block; color: var(--text-muted); font: 400 11px var(--font-body); }
.cs-keeps { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 4px 0 10px; }
.cs-keep { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; font: 500 15px var(--font-body); }
.cs-keep input { width: 20px; height: 20px; }
.cs-own-ending { margin-left: 6px; }
`;

let added = false;
export function ensureCloneSliceStyles() {
  if (added || typeof document === 'undefined' || !document.head) return;
  added = true;
  const style = document.createElement('style');
  style.dataset.feature = 'clone-slice';
  style.textContent = CSS;
  document.head.appendChild(style);
}
