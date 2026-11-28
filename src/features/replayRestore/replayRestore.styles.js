// REPLAY RESTORE - the feature's CSS (feature: replay-restore), added to the page once
const CSS = `
.rr-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.rr-actions .sheet-btn { flex: 1 1 140px; min-height: 40px; margin: 0; }
`;
let added = false;
export function ensureReplayRestoreStyles() {
  if (added || typeof document === 'undefined' || !document.head) return;
  added = true;
  const style = document.createElement('style');
  style.setAttribute('data-feature', 'replay-restore');
  style.textContent = CSS;
  document.head.appendChild(style);
}
