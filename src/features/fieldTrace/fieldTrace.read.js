// ===========================================
// FIELD TRACE - Field Trace (SV)
// How one property travels through the book: its path in timeline order. Every sticky on the board that carries the
// field under the same name (case, [] and ? ignored, as the completeness rule matches them), plus the names it was
// mapped to or from (FieldMapped edges, followed in both directions, and the names found that way matched in turn).
// at: { elementId, field }, the field the trace starts from. null when that field (or its sticky on the board) is gone.
// { field, elementId, count, keys: ['stickyId|fieldkey'], slices: [slice ids on the path], marks: { stickyId: [step numbers] },
//   steps: [{ n, key, elementId, sticky, kind, sliceId, slice, chapterId, field, renamedFrom (the name it was mapped from, when that
//   is another name), gap (it has no source), start, whole (only on a whole event's step: field null) }] }
// A field mapped from a whole event ("products[] ← each ProductConfigured") has that event on its path as a step of its own, and a
// list's item field mapped to an event field ("products[].frameId") is a step on the path of that field.
// The board numbers and dims from marks, the Outline highlights from slices and keys, the strip lists the steps.
// ===========================================

import { sliceTitle, projectState } from '../../core/projections.js';
import { fieldKey } from '../../core/constants.js';
import { fieldSources } from '../fieldSources/rules.js';
import { isPlainName } from '../fieldSources/tidy.js';
import { itemField, mappingOf, propOf, timeline } from '../fieldMapping/mappings.js';

export function fieldTrace(state, at) {
  const start = state.elements[at?.elementId], startProp = propOf(start, at?.field);
  if (!startProp) return null;
  const places = timeline(state);
  if (!places.some(p => p.element.id === start.id)) return null;

  // Every plain-named field of every sticky on the board, and what it is mapped from (the edges, both ways)
  const nodes = new Map(), byName = new Map(), next = new Map();
  const add = (place, prop, order, item = null) => {
    const key = `${place.element.id}|${fieldKey(prop.name)}`;
    if (nodes.has(key)) return;
    nodes.set(key, { key, place, prop, order, item, mapping: mappingOf(state, place.element, prop.name) });
    (byName.get(fieldKey(prop.name)) || byName.set(fieldKey(prop.name), []).get(fieldKey(prop.name))).push(key);
  };
  places.forEach(place => (place.element.properties || []).filter(p => isPlainName(p.name)).forEach((prop, i) => {
    add(place, prop, i);
    // The item fields that come from somewhere ("products[].frameId")
    (prop.items || []).forEach((item, j) => { if (mappingOf(state, place.element, itemField(prop, item))) add(place, { name: itemField(prop, item) }, i + (j + 1) / 1000, item); });
  }));
  // A whole event that something comes from is a step of its own (no field)
  [...nodes.values()].forEach(n => {
    const m = n.mapping?.from;
    const key = m?.whole && `${m.elementId}|`;
    const place = key && places.find(p => p.element.id === m.elementId);
    if (place && !nodes.has(key)) nodes.set(key, { key, place, prop: { name: null }, order: -1, whole: true });
  });
  const link = (a, b) => { (next.get(a) || next.set(a, []).get(a)).push(b); };
  nodes.forEach(n => {
    const from = n.mapping && `${n.mapping.from.elementId}|${n.mapping.from.field == null ? '' : fieldKey(n.mapping.from.field)}`;
    if (from && nodes.has(from)) { link(n.key, from); link(from, n.key); }
  });

  // The path: the same name as any field already on it, or mapped to or from one
  const startKey = `${start.id}|${fieldKey(startProp.name)}`;
  const on = new Set([startKey]);
  const queue = [startKey];
  while (queue.length) {
    const node = nodes.get(queue.shift());
    [...(node.whole ? [] : byName.get(fieldKey(node.prop.name)) || []), ...(next.get(node.key) || [])].forEach(k => { if (!on.has(k)) { on.add(k); queue.push(k); } });
  }

  const { at: gapAt } = fieldSources(state);
  const steps = [...on].map(k => nodes.get(k)).sort((a, b) => a.place.at - b.place.at || a.order - b.order).map((n, i) => {
    const el = n.place.element, ownName = n.item ?? n.prop.name;
    const was = n.mapping?.from.field != null && fieldKey(n.mapping.from.field) !== fieldKey(ownName) ? n.mapping.from.field : null;
    const gap = n.whole ? null : gapAt.get(`${n.place.sliceId}|${el.id}|${n.prop.name}`);
    return { n: i + 1, key: n.key, elementId: el.id, sticky: el.name, kind: el.type, sliceId: n.place.sliceId, slice: sliceTitle(state.slices[n.place.sliceId], state), chapterId: state.slices[n.place.sliceId].chapterId || null,
      field: n.whole ? null : n.prop.name, ...(n.whole ? { whole: true } : {}), renamedFrom: was, gap: !!gap && gap.kind !== 'tidy', start: n.key === startKey };
  });
  const marks = {};
  steps.forEach(s => (marks[s.elementId] ||= []).push(s.n));
  return { field: startProp.name, elementId: start.id, count: steps.length, keys: steps.map(s => s.key), slices: [...new Set(steps.map(s => s.sliceId))], marks, steps };
}

// The same, read from the book as it is now (a tap asks the open book)
export const fieldTraceNow = at => fieldTrace(projectState(), at);
