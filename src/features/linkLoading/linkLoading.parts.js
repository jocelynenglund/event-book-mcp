// ===========================================
// OPENING A LINK - Parts of the loader, each drawn from Link Loading State alone. A root carries data-component and data-key.
// The little book itself (its turning pages) is in index.html, so it is there on the first paint, before any script.
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The bar at the top while you look at a shared copy: a note (read only), Add to my bookshelves, and ✕ to leave it
export function sharedCopyBannerBar(view) {
  return `<div class="sc-banner" data-component="Shared copy banner" data-key="viewing" role="status">
    <span class="sc-note">${escapeHtml(view.title)}</span>
    <button class="sc-add" data-shared-action="add">${escapeHtml(view.add)}</button>
    <button class="sc-close" data-shared-browse="close" aria-label="${escapeHtml(view.close)}">✕</button>
  </div>`;
}

// What the loader says under its book: Opening…, or why the link didn't open and the way back
export function linkLoader(state) {
  return state.failed
    ? `<div class="ll-text failed" data-component="Link loader" data-key="failed">
        <p class="ll-title">${escapeHtml(state.title)}${state.reason ? `: ${escapeHtml(state.reason)}` : ''}</p>
        <button class="sheet-btn" data-link-loader-back>Back to my bookshelves</button>
      </div>`
    : `<div class="ll-text" data-component="Link loader" data-key="opening">
        <p class="ll-title">${escapeHtml(state.title)}</p>
      </div>`;
}
