// ===========================================
// FIELD MAPPING - Parts: the small "← Order Placed.orderId" after a mapped field, and the Comes from… sheet
// Each draws from the view that feeds it alone (Sticky Field Mappings, Field Map Picker); nothing here reads the book.
// A root carries data-component and data-key.
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kindName = { command: 'command', event: 'event', readModel: 'view', screen: 'screen', processor: 'automation' };

// "← Order Placed.orderId", small and muted, after the field ("+2" when it has more sources). from: a field of Sticky Field Mappings
export function fieldMappingMark(from) {
  return `<span class="fm-from" data-component="Field mapping mark" data-key="${escapeHtml(`${from.elementId}|${from.field ?? ''}`)}" title="comes from ${escapeHtml(from.text)}${from.more ? ` and ${from.more} more` : ''}"><i class="fm-arrow" aria-hidden="true">←</i> ${escapeHtml(from.text)}${from.more ? ` <b class="fm-more-n">+${from.more}</b>` : ''}</span>`;
}

// The sheet Comes from… opens: the field's sources as chips (× takes one away), a search box, and one card per sticky it could
// come from (a whole-event button for an event, its fields as chips; a tap adds one, a tap on a chosen one removes it)
export function fieldMapPickerSheet(view) {
  const key = `${view.elementId}:${view.field}`;
  const data = `data-el="${view.elementId}" data-field="${escapeHtml(view.field)}"`;
  const from = (elementId, field, whole) => `data-from-el="${elementId}" data-from-field="${escapeHtml(field ?? '')}"${whole ? ' data-whole="true"' : ''}`;
  const list = view.itemFields.offered;
  const source = s => `<span class="fm-source" role="listitem"><span class="fm-source-text">${escapeHtml(s.text)}</span>${view.canMap ? `<button class="fm-source-x" data-board-action="fm-remove" ${data} ${from(s.elementId, s.field, s.whole)} aria-label="Remove ${escapeHtml(s.text)}">×</button>` : ''}</span>`;
  const pill = (c, f) => `<button class="fm-pill${f.selected ? ' on' : ''}${f.same ? ' same' : ''}" data-board-action="fm-toggle" ${data} ${from(c.elementId, f.name)} data-text="${escapeHtml(`${c.sticky}.${f.name}`)}" aria-pressed="${f.selected}"${view.canMap ? '' : ' disabled'}>${escapeHtml(f.name)}</button>`;
  const card = c => `
        <div class="fm-card${c.same ? ' same' : ''}" data-sticky="${c.elementId}">
          <div class="fm-card-head"><span class="fm-card-name">${escapeHtml(c.sticky)}</span><span class="fm-card-where">${escapeHtml(kindName[c.kind] || c.kind)} · ${escapeHtml(c.slice)}</span></div>
          <div class="fm-card-pills">${c.whole ? `<button class="fm-pill fm-whole${c.whole.selected ? ' on' : ''}" data-board-action="fm-toggle" ${data} ${from(c.elementId, null, true)} data-text="${escapeHtml(`${list ? 'each ' : ''}${c.sticky}`)}" aria-pressed="${c.whole.selected}"${view.canMap ? '' : ' disabled'}>whole event</button>` : ''}${c.fields.map(f => pill(c, f)).join('')}</div>
        </div>`;
  return `
    <div class="fg-sheet fm-sheet" data-component="Field map picker sheet" data-key="${escapeHtml(key)}">
      <div class="fg-kicker">Information completeness</div>
      <div class="sheet-title">Where does <b>${escapeHtml(view.sticky)}.${escapeHtml(view.field)}</b> come from?</div>
      <div class="fm-sources" role="list" aria-label="Where it comes from now">${view.sources.length ? view.sources.map(source).join('') : '<span class="fm-none">No source yet</span>'}</div>
      <div class="fm-add">＋ Add a source</div>
      <input type="search" class="sheet-input" id="fmQuery" value="${escapeHtml(view.query)}" placeholder="Search by sticky, field or slice" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search the stickies it could come from">
      ${list && view.cards.some(c => c.whole) ? `<label class="fm-items"><input type="checkbox" id="fmItems"${view.itemFields.checked ? ' checked' : ''}> Also give the list the event's fields</label>` : ''}
      <div class="fm-cards">${view.cards.length ? view.cards.map(card).join('') : '<div class="fm-none">Nothing to take it from</div>'}${view.more ? `<div class="fm-more">${view.more} more: type to narrow</div>` : ''}</div>
      <div class="fg-actions"><button class="sheet-btn" data-board-action="fm-done">Done</button></div>
    </div>`;
}
