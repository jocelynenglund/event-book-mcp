// ===========================================
// SYNC - Parts of the bookshelves' library line, drawn from Library Sign In alone.
// A root carries data-component and data-key.
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The line under "Bookshelves": the account (and a note when only the server's books show), or the sign-in
export function libraryAccountBar(v) {
  return `<div class="sy-bar" id="syBar" data-component="Library account bar" data-key="${v.action}"><button class="sy-account" data-sync-action="${v.action}">${escapeHtml(v.label)}</button>${v.signedIn ? '<span class="sy-note" id="syServerOnly"></span>' : ''}</div>`;
}

// The chip in an open book's top bar: ☁ Save to library, ✓ Saved, ↻ Saving…, ⚠ Not saved (nothing when hidden)
export function saveChipButton(v) {
  if (v.state === 'hidden') return '';
  return `<button class="sy-chip sy-save" id="sySave" data-component="Save chip button" data-key="${v.state}" data-state="${v.state}" data-sync-action="chip-${v.action}" title="${escapeHtml(v.title)}" aria-label="${escapeHtml(`${v.label}: ${v.title}`)}"><span class="sy-save-icon" aria-hidden="true">${v.icon}</span> <span class="sy-save-text">${escapeHtml(v.label)}</span></button>`;
}
