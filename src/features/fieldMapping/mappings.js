// ===========================================
// FIELD MAPPING - Where a field comes from, and where each sticky sits in time
// A field can come from another sticky's field (FieldMapped): "orderRef ← Order Placed.orderId", or from a whole event
// (from.field is null): "products[] ← each ProductConfigured". A list's item field is written "products[].frameId".
// Pure helpers the views, the completeness rule and the commands share.
// ===========================================

import { fieldKey } from '../../core/constants.js';
import { getOrderedSlices } from '../../core/projections.js';
import { laneOf } from '../board/command.js';

export const propOf = (el, name) => (el?.properties || []).find(p => fieldKey(p.name) === fieldKey(name));

// A list field: typed as an array, or written with [] after its name
export const isList = prop => !!prop && (prop.type === 'array' || /\[\s*\]$/.test(prop.name));
const bare = name => String(name).replace(/\s*\[\s*\]$/, '');

// How an item field is written: "products[].frameId"
export const itemField = (list, item) => `${bare(list.name)}[].${item}`;

// "products[].frameId" → { prop: the list field, item: its item field's name } (null when it isn't one the sticky has)
export function itemOf(el, name) {
  const m = String(name ?? '').match(/^(.*?)\s*\[\s*\]\s*\.\s*(.+)$/);
  const prop = m && propOf(el, m[1]);
  const item = prop && (prop.items || []).find(i => fieldKey(i) === fieldKey(m[2]));
  return item ? { prop, item } : null;
}

// What a mapping names on its sticky: the field, or a list's item field. { name (as the sticky has it), prop, item? } or null
export function fieldOf(el, name) {
  const prop = propOf(el, name);
  if (prop) return { name: prop.name, prop };
  const at = itemOf(el, name);
  return at ? { name: itemField(at.prop, at.item), prop: at.prop, item: at.item } : null;
}

// Only an event can be a whole source (an external event or one stored elsewhere is an event too)
export const isWholeSource = el => el?.type === 'event';

// What a mapped field comes from, while it still can: { field, from: { elementId, sticky, field, text, whole? } }, or null
// when it isn't mapped, or the sticky or field it came from is gone. A whole event has field null and whole true; for a
// list its text says "each ProductConfigured" (one item per event), otherwise just the event.
export function mappingOf(state, el, name) {
  const sources = sourcesOf(state, el, name);
  return sources.length ? { field: el.mappings[fieldKey(name)].field, from: sources.length > 1 ? { ...sources[0], more: sources.length - 1 } : sources[0], sources } : null;
}

// One source as the views say it: { elementId, sticky, field, text, whole? }, or null when its sticky or field is gone (or a
// whole source is no event). For a list a whole event's text says "each ProductConfigured" (one item per event).
function sourceText(state, el, name, src) {
  const source = state.elements[src.elementId];
  if (!source) return null;
  if (src.field == null) {
    if (!isWholeSource(source)) return null;
    return { elementId: source.id, sticky: source.name, field: null, whole: true, text: `${isList(propOf(el, name)) ? 'each ' : ''}${source.name}` };
  }
  const prop = propOf(source, src.field);
  return prop ? { elementId: source.id, sticky: source.name, field: prop.name, text: `${source.name}.${prop.name}` } : null;
}

// Every source a field has, while it still can, in the order they were made
export function sourcesOf(state, el, name) {
  return (el?.mappings?.[fieldKey(name)]?.sources || []).map(s => sourceText(state, el, name, s)).filter(Boolean);
}

// Following "comes from" upwards from a field: would it reach (elementId, field)? A mapping there would make a loop.
export function reaches(state, from, elementId, field) {
  const seen = new Set();
  const stack = [{ elementId: from.elementId, key: from.field == null ? '' : fieldKey(from.field) }];
  while (stack.length) {
    const at = stack.pop();
    // A whole event holds every field of it
    if (at.elementId === elementId && (at.key === fieldKey(field) || at.key === '')) return true;
    const id = `${at.elementId}|${at.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    (state.elements[at.elementId]?.mappings?.[at.key]?.sources || []).forEach(n => stack.push({ elementId: n.elementId, key: n.field == null ? '' : fieldKey(n.field) }));
  }
  return false;
}

// A slice's stickies in the order data flows: a change top-down (screen → command → event), a view the other way
function inFlowOrder(slice, state) {
  const els = slice.elements.map(id => state.elements[id]).filter(Boolean);
  const lanes = slice.type === 'SV' ? [2, 1, 0] : [0, 1, 2];
  return lanes.flatMap(l => els.filter(e => laneOf[e.type] === l));
}

// Every sticky on the board in timeline order (slices as the board lays them out, a slice's stickies in flow order),
// each once, at its first slice: [{ element, sliceId, at }]
export function timeline(state) {
  const seen = new Set();
  const out = [];
  getOrderedSlices(state).forEach(slice => inFlowOrder(slice, state).forEach(el => {
    if (seen.has(el.id)) return;
    seen.add(el.id);
    out.push({ element: el, sliceId: slice.id, at: out.length });
  }));
  return out;
}
