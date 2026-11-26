// ===========================================
// FIELD MAPPING - Parts: the small "← Order Placed.orderId" after a mapped field, and the Comes from… sheet
// Each draws from the view that feeds it alone (Sticky Field Mappings, Field Map Picker); nothing here reads the book.
// A root carries data-component and data-key.
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kindName = { command: 'command', event: 'event', readModel: 'view', screen: 'screen', processor: 'automation' };

// "← Order Placed.orderId", small and muted, after the field. from: a field of Sticky Field Mappings
export function fieldMappingMark(from) {
  return `<span class="fm-from" data-component="Field mapping mark" data-key="${escapeHtml(`${from.elementId}|${from.field ?? ''}`)}" title="comes from ${escapeHtml(from.text)}"><i class="fm-arrow" aria-hidden="true">←</i> ${escapeHtml(from.text)}</span>`;
}

// The sheet Comes from… opens: what the field comes from now (to unmap it), a search box and the fields it could come from
export function fieldMapPickerSheet(view) {
  const key = `${view.elementId}:${view.field}`;
  const data = `data-el="${view.elementId}" data-field="${escapeHtml(view.field)}"`;
  const list = view.itemFields.offered;
  const option = o => `
      <button class="bd-chip fm-option${o.same ? ' same' : ''}${o.whole ? ' whole' : ''}" data-board-action="fm-pick" ${data} data-from-el="${o.elementId}" data-from-field="${escapeHtml(o.field ?? '')}"${o.whole ? ` data-whole="true" data-text="${escapeHtml(`${list ? 'each ' : ''}${o.sticky}`)}"` : ''}>
        <span class="fm-opt-name">${o.whole ? `${escapeHtml(o.sticky)} — whole event` : `${escapeHtml(o.sticky)}.${escapeHtml(o.field)}`}</span>
        <span class="fm-opt-where">${escapeHtml(kindName[o.kind] || o.kind)} · ${escapeHtml(o.slice)}</span>
      </button>`;
  return `
    <div class="fg-sheet fm-sheet" data-component="Field map picker sheet" data-key="${escapeHtml(key)}">
      <div class="fg-kicker">Information completeness</div>
      <div class="sheet-title">Comes from… <span class="bd-sheet-sub">${escapeHtml(view.field)} on ${escapeHtml(view.sticky)}</span></div>
      ${view.from ? `<p class="fm-now">Comes from <b>${escapeHtml(view.from.text)}</b> <button class="bd-chip fm-unmap" data-board-action="fm-unmap" ${data}>Unmap</button></p>` : ''}
      <input type="search" class="sheet-input" id="fmQuery" value="${escapeHtml(view.query)}" placeholder="Search by sticky, field or slice" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search the fields it could come from">
      ${list && view.options.some(o => o.whole) ? `<label class="fm-items"><input type="checkbox" id="fmItems"${view.itemFields.checked ? ' checked' : ''}> Also give the list the event's fields</label>` : ''}
      <div class="fm-list">${view.options.length ? view.options.map(option).join('') : '<div class="fm-none">No field to take it from</div>'}${view.more ? `<div class="fm-more">${view.more} more: type to narrow</div>` : ''}</div>
      <div class="fg-actions"><button class="sheet-btn secondary" data-board-action="close">Cancel</button></div>
    </div>`;
}
