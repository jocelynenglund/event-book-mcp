// ===========================================
// SHARE LINKS - Parts of the Share links sheet and of the share sheet's Name field, each drawn from one view. A root
// carries data-component and data-key.
//   Share link name field  <- Share Link Name
//   Share links list       <- Your Share Links (its row, Share link row, draws one entry of it)
//   Admin link removal     <- Admin Link Removal
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The Name field above Copy link, filled with the book's name and the day
export function shareLinkNameField(view) {
  return `<label class="sl-name" data-component="Share link name field" data-key="name">
    <span class="sl-name-label">${escapeHtml(view.label)}</span>
    <input class="sheet-input" id="shareLinkName" maxlength="500" autocomplete="off" value="${escapeHtml(view.value)}">
  </label>`;
}

// One link: its name, book and day, and what you can do: Copy link, Rename, Remove (asked inside the row, never a dialog)
export function shareLinkRow(row) {
  const id = escapeHtml(row.shareId);
  const meta = `${row.bookName ? `${escapeHtml(row.bookName)} · ` : ''}${escapeHtml(row.date)}`;
  if (row.mode === 'rename') {
    return `<li class="sl-row" data-component="Share link row" data-key="${id}">
      <input class="sheet-input" data-share-link-name value="${escapeHtml(row.name)}" maxlength="500" aria-label="Name">
      <div class="sl-actions">
        <button class="sheet-btn" data-share-link-action="rename-save" data-share-id="${id}">Save</button>
        <button class="sheet-btn secondary" data-share-link-action="cancel" data-share-id="${id}">Cancel</button>
      </div>
    </li>`;
  }
  if (row.mode === 'confirm-remove') {
    return `<li class="sl-row" data-component="Share link row" data-key="${id}">
      <div class="sl-row-name">${escapeHtml(row.name)}</div>
      <p class="sl-confirm">Remove this link? Anyone who opens it will be told it was removed.</p>
      <div class="sl-actions">
        <button class="sheet-btn danger" data-share-link-action="remove-confirm" data-share-id="${id}">Remove</button>
        <button class="sheet-btn secondary" data-share-link-action="cancel" data-share-id="${id}">Keep it</button>
      </div>
    </li>`;
  }
  return `<li class="sl-row" data-component="Share link row" data-key="${id}">
    <div class="sl-row-name">${escapeHtml(row.name)}</div>
    <div class="sl-row-meta">${meta}</div>
    <div class="sl-actions">
      <button class="sheet-btn secondary" data-share-link-action="copy" data-share-id="${id}" data-link="${escapeHtml(row.link)}">Copy link</button>
      <button class="sheet-btn secondary" data-share-link-action="rename" data-share-id="${id}">Rename</button>
      <button class="sheet-btn secondary" data-share-link-action="remove" data-share-id="${id}">Remove</button>
    </div>
  </li>`;
}

// The sheet: the links (or the way to make one), and Close. loading: the list has not come back yet.
export function shareLinksList(view, { loading = false, failed = false } = {}) {
  const body = loading ? '<p class="sl-empty">Loading…</p>'
    : failed ? '<p class="sl-empty">Couldn\'t load your links: check the connection and open this again.</p>'
    : view.empty ? '<p class="sl-empty">No share links yet. Share a book and choose Copy link: it shows up here.</p>'
    : `<ul class="sl-list">${view.rows.map(shareLinkRow).join('')}</ul>`;
  return `<div data-component="Share links list" data-key="links">
    <div class="sheet-title">Your share links</div>
    ${body}
    <button class="sheet-btn" data-share-link-action="close">Close</button>
  </div>`;
}

// The admin's way to remove an old link nobody owns: paste it
export function adminLinkRemoval(view) {
  if (!view.show) return '';
  return `<div class="sl-admin" data-component="Admin link removal" data-key="admin">
    <label class="sl-name"><span class="sl-name-label">${escapeHtml(view.label)}</span>
      <input class="sheet-input" id="shareLinkAdminPaste" placeholder="${escapeHtml(view.hint)}" autocomplete="off">
    </label>
    <button class="sheet-btn secondary" data-share-link-action="admin-remove">Remove it</button>
  </div>`;
}
