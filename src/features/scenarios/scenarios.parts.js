// ===========================================
// SCENARIOS - Parts: a scenario's lines, drawn from Scenario Lines alone
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// { k: v, … } after a sticky's name (nothing when no value was filled in)
const valuesHtml = entries => entries.length
  ? ` <span class="gwt-values">{ ${entries.map(e => `${escapeHtml(e.key)}: ${e.alias ? `<span class="gwt-id">${escapeHtml(e.text)}</span>` : escapeHtml(e.text)}`).join(', ')} }</span>`
  : '';

const refHtml = r => r
  ? `<span class="gwt-ref" data-type="${r.type}"${r.attrs}>${escapeHtml(r.name)}</span>${valuesHtml(r.values)}`
  : '<span class="gwt-missing">(removed)</span>';

// A view's rows: a small table, a column per field and a row per entry ("(empty)" when there are none)
const tableHtml = t => t.rows.length
  ? `<table class="gwt-table"><thead><tr>${t.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r =>
    `<tr>${r.map(c => `<td>${c ? (c.alias ? `<span class="gwt-id">${escapeHtml(c.text)}</span>` : escapeHtml(c.text)) : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  : '<span class="gwt-none">(empty)</span>';

function bodyHtml(b) {
  if (b.none) return `<span class="gwt-none">${b.none}</span>`;
  if (b.rejected !== undefined) return `<span class="gwt-reject">Rejected: ${escapeHtml(b.rejected)}</span>`;
  if (b.nothing !== undefined) return `<span class="gwt-none">Nothing${b.nothing ? ` (${escapeHtml(b.nothing)})` : ''}</span>`;
  if (b.query !== undefined) return `<span class="gwt-query">${escapeHtml(b.query)}</span>`;
  if (b.table) return `${refHtml(b.ref)}<span class="gwt-rows">${tableHtml(b.table)}</span>`;
  if (b.rowCount) return `${refHtml(b.ref)} <span class="gwt-values">(${b.rowCount} ${b.rowCount === 1 ? 'row' : 'rows'})</span>`;
  return refHtml(b.ref);
}

// One scenario as Given / And / When / Then lines
export function scenarioLinesBlock(view) {
  return `<div class="gwt" data-component="Scenario lines" data-key="${escapeHtml(view.id)}">${view.lines.map(l =>
    `<div class="gwt-line"><span class="gwt-kw">${l.kw}</span><span class="gwt-body">${bodyHtml(l.body)}</span></div>`).join('')}</div>`;
}
