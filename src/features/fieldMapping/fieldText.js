// ===========================================
// FIELD MAPPING - Fields written as text: "orderRef ← Order Placed.orderId"
// A plan file's "fields" (and the MCP's add_steps / edit_slice) list a step's fields by name. An entry written
// "orderRef ← Order Placed.orderId" (or "orderRef <- Order Placed.orderId") is the field orderRef, which comes from the
// field orderId of the sticky Order Placed. "products[] ← ProductConfigured" (no .field; "each" may precede it) is the field
// products, which comes from the whole event ProductConfigured (from: null). Pure: from the text to the fields and the mappings.
// ===========================================

import { splitEntries, parsePropertyText } from '../../core/constants.js';

const ARROW = /^(.*?)\s*(?:←|<-)\s*(.*)$/;

// fields: a string ("orderId, size") or a list of them. Returns
//   { text: the fields as names to add ("orderRef, amount"), mappings: [{ field, sticky, from (null: the whole event) }], error: the first thing wrong, or null }
export function parseFieldList(fields) {
  const entries = (Array.isArray(fields) ? fields : fields ? [fields] : []).flatMap(f => splitEntries(String(f)));
  const names = [], mappings = [];
  let error = null;
  entries.forEach(entry => {
    const m = entry.match(ARROW);
    if (!m) { names.push(entry); return; }
    const [, left, right] = m;
    const field = parsePropertyText(left, 'string').parsed[0]?.name;
    // "products[] ← ProductConfigured" (no dot, "each" allowed): the whole event
    const event = right.trim().replace(/^each\s+/i, '').trim();
    const dot = right.lastIndexOf('.');
    if (field && event && !event.includes('.')) { names.push(left); mappings.push({ field, sticky: event, from: null }); return; }
    if (!field || dot < 1 || dot === right.length - 1) { error ||= `"${entry}": a field that comes from another needs "Sticky.field" (or an event's name) after the arrow`; return; }
    names.push(left);
    mappings.push({ field, sticky: right.slice(0, dot).trim(), from: right.slice(dot + 1).trim() });
  });
  return { text: names.join(', '), mappings, error };
}

// "Order Placed.orderId" → { sticky, field } (the field is what follows the last dot), or null
export function splitStickyField(text) {
  const s = String(text ?? '').trim(), dot = s.lastIndexOf('.');
  return dot > 0 && dot < s.length - 1 ? { sticky: s.slice(0, dot).trim(), field: s.slice(dot + 1).trim() } : null;
}
