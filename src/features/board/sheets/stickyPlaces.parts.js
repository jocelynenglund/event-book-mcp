// ===========================================
// BOARD SHEETS - The list a 🔗 N mark opens, drawn from Sticky Places alone: each slice a reused sticky is in, the one
// you came from marked "here", the one that makes an event marked "made here", and ↗ to jump to the others.
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function stickyPlacesBody(view) {
  const row = r => `
      <div class="bd-place-row${r.here ? ' here' : ''}" data-slice="${r.sliceId}">
        <span class="bd-place-slice"><b>${escapeHtml(r.ref)}</b> ${escapeHtml(r.title)}</span>
        ${r.here ? '<span class="bd-place-chip">here</span> ' : ''}${r.made ? '<span class="bd-place-chip made">made here</span>' : ''}
        ${r.here ? '' : `<button class="bd-place-go" data-board-action="place-go" data-el="${view.elementId}" data-slice="${r.sliceId}" aria-label="Go to ${escapeHtml(r.ref)} ${escapeHtml(r.title)}">↗</button>`}
      </div>`;
  return `
    <div data-component="Sticky places sheet" data-key="${view.elementId}">
      <div class="sheet-title">${escapeHtml(view.name)} is in ${view.count} slices</div>
      ${view.warning ? `<div class="bd-place-warn">${view.warning}</div>` : ''}
      <div class="bd-places">${view.rows.map(row).join('')}</div>
    </div>`;
}
