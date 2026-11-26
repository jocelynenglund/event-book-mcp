// ===========================================
// FIELD MAPPING - Field Map Picker (SV)
// The fields one field could come from (Comes from…): the fields of the other stickies on the board, narrowed by what
// is typed (their sticky, field or slice name). Events come first as a whole ("ProductConfigured — whole event": the field
// comes from the entire event; field null, whole true), the one named like the field on top; then the fields: same-name
// fields on top, then the stickies before it on the timeline (the nearest first), then the ones after it. A field that would make a loop (it already comes from this one) is not
// offered; a field written as prose isn't a name. readOnly: a book that can't be changed here can look but not map.
// { elementId, field, sticky, from (what it comes from now, or null), query, canMap, more, itemFields: { offered, checked },
//   options: [{ key, elementId, sticky, kind, slice, field (null for a whole event), whole, same }] }
// itemFields: a list field can also be given the event's fields as item fields (offered); checked unless it has item fields
// already (itemsChecked: what the person has ticked, kept when the sheet draws again).
// ===========================================

import { projectState, sliceTitle } from '../../core/projections.js';
import { fieldKey } from '../../core/constants.js';
import { isPlainName } from '../fieldSources/tidy.js';
import { isList, isWholeSource, mappingOf, propOf, reaches, timeline } from './mappings.js';

const LIMIT = 40;
const squash = s => String(s ?? '').toLowerCase().replace(/[\s_\-.]+/g, '');
// The words of a name (ProductConfigured → product, configured), in the singular, to tell an event named like a field
const words = name => new Set(String(name).replace(/\[\s*\]|\?/g, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2).map(w => w.replace(/(ies)$/, 'y').replace(/(?<!s)s$/, '')));

export function fieldMapPicker(state, elementId, field, { query = '', readOnly = false, itemsChecked = null } = {}) {
  const el = state.elements[elementId];
  const prop = propOf(el, field);
  if (!prop) return null;
  const places = timeline(state);
  const here = places.find(p => p.element.id === elementId)?.at ?? Infinity;
  const q = squash(query);
  const rows = places.filter(p => p.element.id !== elementId).flatMap(p => (p.element.properties || [])
    .filter(f => isPlainName(f.name) && !reaches(state, { elementId: p.element.id, field: f.name }, elementId, prop.name))
    .map(f => ({ p, f })))
    .map(({ p, f }) => ({
      key: `${p.element.id}|${fieldKey(f.name)}`, elementId: p.element.id, sticky: p.element.name, kind: p.element.type, field: f.name,
      slice: sliceTitle(state.slices[p.sliceId], state), same: fieldKey(f.name) === fieldKey(prop.name), at: p.at
    }))
    .filter(o => !q || squash(`${o.sticky} ${o.field} ${o.slice}`).includes(q));
  // Events as a whole: the one named like the field first (same words), then earlier before later, the nearest first
  const mine = words(prop.name);
  const events = places.filter(p => p.element.id !== elementId && isWholeSource(p.element)
    && !(p.element.properties || []).some(f => reaches(state, { elementId: p.element.id, field: f.name }, elementId, prop.name)))
    .map(p => ({ key: `${p.element.id}|`, elementId: p.element.id, sticky: p.element.name, kind: p.element.type, field: null, whole: true,
      slice: sliceTitle(state.slices[p.sliceId], state), same: squash(p.element.name) === squash(prop.name), at: p.at,
      likely: [...words(p.element.name)].some(w => mine.has(w)) }))
    .filter(o => !q || squash(`${o.sticky} whole event ${o.slice}`).includes(q))
    .map((o, i) => ({ o, i })).sort((a, b) => (b.o.same - a.o.same) || (b.o.likely - a.o.likely) || (a.o.at < here ? 0 : 1) - (b.o.at < here ? 0 : 1) || (a.o.at < here ? b.o.at - a.o.at : a.o.at - b.o.at) || a.i - b.i)
    .map(({ o }) => o);
  // Same name first; earlier before later; the nearest first
  const rank = o => (o.same ? 0 : 2) + (o.at < here ? 0 : 1);
  const near = (a, b) => (a.at < here ? b.at - a.at : a.at - b.at);
  const sorted = rows.map((o, i) => ({ o, i })).sort((a, b) => rank(a.o) - rank(b.o) || near(a.o, b.o) || a.i - b.i).map(({ o }) => o);
  return {
    elementId, field: prop.name, sticky: el.name, from: mappingOf(state, el, prop.name)?.from || null, query, canMap: !readOnly,
    itemFields: { offered: isList(prop), checked: isList(prop) && (itemsChecked ?? !(prop.items || []).length) },
    more: Math.max(0, events.length + sorted.length - LIMIT),
    options: [...events, ...sorted.map(o => ({ ...o, whole: false }))].slice(0, LIMIT).map(({ at, likely, ...o }) => o)
  };
}

// The same, read from the book as it is now (a tap asks the open book)
export const fieldMapPickerNow = (elementId, field, opts) => fieldMapPicker(projectState(), elementId, field, opts);
