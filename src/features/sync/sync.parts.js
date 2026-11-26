// ===========================================
// SYNC - Parts of the bookshelves' library line, drawn from Library Sign In alone.
// A root carries data-component and data-key.
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The line under "Bookshelves": the account (and a note when only the server's books show), or the sign-in
export function libraryAccountBar(v) {
  return `<div class="sy-bar" id="syBar" data-component="Library account bar" data-key="${v.action}"><button class="sy-account" data-sync-action="${v.action}">${escapeHtml(v.label)}</button>${v.signedIn ? '<span class="sy-note" id="syServerOnly"></span>' : ''}</div>`;
}

// The chip beside an open book's title: who has it. The words are the icon and label; a phone shows the icon
// (the full words stay in aria-label). An agent's icon is the itsyBIT mark.
export function checkoutChipButton(v, { mark = '' } = {}) {
  const icon = v.agent && mark ? mark : `<span class="sy-chip-icon">${escapeHtml(v.icon)}</span>`;
  return `<button class="sy-chip" id="syCheckout" data-component="Checkout chip button" data-key="${v.state}" data-state="${v.state}" data-sync-action="${v.action}" title="${escapeHtml(v.title)}" aria-label="${escapeHtml(v.title)}">${icon}<span class="sy-chip-text"> ${escapeHtml(v.label)}</span></button>`;
}

// The chip in an open book's top bar: ☁ Save to library, ✓ Saved, ↻ Saving…, ⚠ Not saved (nothing when hidden)
export function saveChipButton(v) {
  if (v.state === 'hidden') return '';
  return `<button class="sy-chip sy-save" id="sySave" data-component="Save chip button" data-key="${v.state}" data-state="${v.state}" data-sync-action="chip-${v.action}" title="${escapeHtml(v.title)}" aria-label="${escapeHtml(`${v.label}: ${v.title}`)}"><span class="sy-save-icon" aria-hidden="true">${v.icon}</span> <span class="sy-save-text">${escapeHtml(v.label)}</span></button>`;
}
