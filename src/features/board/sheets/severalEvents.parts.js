// ===========================================
// BOARD SHEETS - Parts of the "＋ Several…" sheet: the form from Several Events Form, the preview from Several Events Preview
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The heading, a box to type the lines in, and the slot the preview is drawn into
export function severalEventsFormBody(form) {
  return `
    <div data-component="Several events form" data-key="${form.sliceId}">
      <div class="sheet-title">${escapeHtml(form.heading)} <span class="bd-sheet-sub">in ${escapeHtml(form.sliceName)}</span></div>
      <div class="bd-cell-hint">One event per line, like OrderPlaced(orderId, total). Fields are optional.</div>
      <textarea class="sheet-input bd-several-text" id="bdSeveralText" rows="6" autocomplete="off" spellcheck="false" placeholder="PnrFound(pnr, name)&#10;PnrCancelled(pnr, reason)&#10;TripChanged(pnr, items[])" data-draft="several"></textarea>
      <div class="sheet-draft-kept" hidden>Draft kept</div>
      <div id="bdSeveralPreview"></div>
    </div>`;
}

// What each line will do, and the button that adds them
export function severalEventsPreviewBody(preview) {
  return `
    <div class="bd-several-preview" data-component="Several events preview" data-key="${preview.sliceId}">
      ${preview.rows.map(r => `
      <div class="bd-several-row ${r.status}">
        <span class="bd-several-status">${r.status}</span>
        <span class="bd-several-name">${escapeHtml(r.name)}</span>
        ${r.fields.length ? `<span class="bd-several-fields">${escapeHtml(r.fields.join(', '))}</span>` : ''}
        ${r.note ? `<div class="bd-several-note">${escapeHtml(r.note)}</div>` : ''}
        ${r.extra ? `<div class="bd-several-note">${escapeHtml(r.extra)}</div>` : ''}
      </div>`).join('')}
      <button class="sheet-btn" id="bdSeveralAdd" data-board-action="several-add" data-slice="${preview.sliceId}"${preview.add.count ? '' : ' disabled'}>${escapeHtml(preview.add.label)}</button>
      <button class="sheet-btn secondary" data-draft-cancel>Cancel</button>
    </div>`;
}
