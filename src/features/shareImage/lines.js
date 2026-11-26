// ===========================================
// SHARE IMAGE - A scenario as lines (Given / When / Then)
// Keyword, the element it names (coloured swatch) or a note; with values, each line's example values. A view's query is a
// Q line; its rows come under its Then, one line each ("name: anna · place: 1"), or "(empty)".
// ===========================================

// A scenario's values, as a short line: { orderId: o1, size: footlong } (empty ones left out)
const filledIn = v => v !== '' && v !== null && v !== undefined;
export const valuesText = values => {
  const parts = Object.entries(values || {}).filter(([, v]) => filledIn(v)).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  return parts.length ? `{ ${parts.join(', ')} }` : '';
};

// One row of a view: name: anna · place: 1
const rowLine = row => Object.entries(row || {}).filter(([, v]) => filledIn(v)).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join(' · ');

export function gwtLines(scn, state, showValues = false) {
  const ref = (kw, id, values) => {
    const el = state.elements[id];
    const v = showValues ? valuesText(values) : '';
    return el ? { kw, text: `${el.name}${v ? ` ${v}` : ''}`, type: el.type, external: !!el.external, table: !!el.table, published: el.type === 'event' && !!el.published && !el.external } : { kw, text: '(removed)' };
  };
  const lines = (scn.given || []).map((g, i) => ref(i ? 'And' : 'Given', g.elementId, g.values));
  if (!lines.length) lines.push({ kw: 'Given', text: 'nothing happened yet' });
  if (scn.when?.commandId) lines.push(ref('When', scn.when.commandId, scn.when.values));
  if (scn.when?.query) lines.push({ kw: 'Q', text: scn.when.query });
  const then = scn.then;
  if (then?.type === 'event') lines.push(ref('Then', then.eventId, then.values));
  else if (then?.type === 'readModel') {
    const rows = Array.isArray(then.rows) ? then.rows : null;
    lines.push(ref('Then', then.readModelId, rows ? null : then.values));
    if (rows && showValues) lines.push(...(rows.length ? rows.map(r => ({ kw: '', text: rowLine(r) })) : [{ kw: '', text: '(empty)' }]));
    else if (rows) lines.at(-1).text += rows.length ? ` · ${rows.length} ${rows.length === 1 ? 'row' : 'rows'}` : ' · (empty)';
  }
  else if (then?.type === 'nothing') lines.push({ kw: 'Then', text: `nothing${then.reason ? ` (${then.reason})` : ''}` });
  else if (then?.type === 'rejection') lines.push({ kw: 'Then', text: `✕ ${then.reason || 'rejected'}`, reject: true });
  else lines.push({ kw: 'Then', text: 'not set' });
  return lines;
}
