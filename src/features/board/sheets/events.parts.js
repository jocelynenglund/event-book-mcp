// ===========================================
// BOARD SHEETS - Parts of a slice's events drawer, drawn from Slice Events Drawer alone
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// One event: tap to go to its command (or read it), ✎ to edit it, ✕ to stop reading it here
export function eventDrawerRow(row) {
  return `
      <div class="bd-event-row" data-component="Event drawer row" data-key="${row.id}">
        <button class="bd-card" data-type="event"${row.attrs} data-board-action="${row.go.action}" data-el="${row.go.el}" data-slice="${row.go.slice}">
          <span class="bd-card-kind${row.hint ? ' bd-hint' : ''}">${escapeHtml(row.kind)}</span>
          <span class="bd-card-name">${escapeHtml(row.name)}</span>
          ${row.props.length ? `<div class="bd-props">${row.props.map(p => `<span>${escapeHtml(p)}</span>`).join('')}</div>` : ''}
        </button>
        ${row.editable ? `<button class="bd-event-edit" data-board-action="event-edit" data-el="${row.id}" data-slice="${row.sliceId}" aria-label="Edit ${escapeHtml(row.name)}">✎</button>` : ''}
        ${row.remove ? `<button class="bd-event-remove" data-board-action="event-stop" data-el="${row.id}" data-slice="${row.sliceId}" aria-label="${escapeHtml(row.remove.label)}" title="Not read here">✕</button>` : ''}
      </div>`;
}

// + Event (or + An event it reads), and ＋ Several… beside it for a box of them
export function addEventButton(drawer) {
  return `<div class="bd-add-events" data-component="Add event button" data-key="${drawer.sliceId}">
      <button class="sheet-btn secondary" data-board-action="event-add" data-slice="${drawer.sliceId}">+ ${escapeHtml(drawer.addLabel)}</button>
      <button class="sheet-btn secondary" data-board-action="event-several" data-slice="${drawer.sliceId}">＋ Several…</button>
    </div>`;
}

// From the Given list: the full, editable list of the events the view reads
export function allEventsButton(link) {
  return `<button class="sheet-btn secondary" data-component="All events button" data-key="${link.sliceId}" data-board-action="event-all" data-slice="${link.sliceId}">${escapeHtml(link.label)}</button>`;
}

// The whole sheet
export function eventsDrawerBody(drawer, allLink = null) {
  return `
    <div class="sheet-title">${drawer.heading} <span class="bd-sheet-sub">${escapeHtml(drawer.sub)}</span></div>
    <div class="bd-events">${drawer.groups.map(g => (g.title ? `<div class="bd-sheet-label">${g.title}</div>` : '') + g.rows.map(eventDrawerRow).join('')).join('')}
    </div>
    ${allLink ? allEventsButton(allLink) : ''}
    ${drawer.readOnly ? '' : addEventButton(drawer)}`;
}
