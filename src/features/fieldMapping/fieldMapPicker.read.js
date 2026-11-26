// ===========================================
// FIELD MAPPING - Field Map Picker (SV)
// The sheet "Where does ‹Sticky›.‹field› come from?": what the field comes from now (any number of sources) and the stickies it
// could come from, one card each, grouped by sticky (a whole event, and its fields). Narrowed by what is typed (sticky, field
// or slice name). Cards: the stickies drawn into this slice first (in the order data flows), then the ones with a field
// named like this one (same), then the rest by name. A field that would make a loop (it already comes from this one) is not
// offered; a field written as prose isn't a name. readOnly: a book that can't be changed here can look but not map.
// { elementId, field, sticky, query, canMap, more,
//   sources: [{ key, elementId, sticky, field (null for a whole event), whole, text }],
//   cards: [{ elementId, sticky, kind, slice, here, same (it has a field named like this one),
//             whole: { key, selected } | null (events only), fields: [{ key, name, selected, same }] }],
//   itemFields: { offered, checked } }
// itemFields: a list field can also be given the event's fields as item fields (offered); checked unless it has item fields
// already (itemsChecked: what the person has ticked, kept when the sheet draws again).
// ===========================================

import { projectState, sliceTitle } from '../../core/projections.js';
import { fieldKey } from '../../core/constants.js';
import { isPlainName } from '../fieldSources/tidy.js';
import { isList, isWholeSource, propOf, reaches, sourcesOf, timeline } from './mappings.js';

const LIMIT = 30;
const squash = s => String(s ?? '').toLowerCase().replace(/[\s_\-.]+/g, '');

export function fieldMapPicker(state, elementId, field, { query = '', readOnly = false, itemsChecked = null } = {}) {
  const el = state.elements[elementId];
  const prop = propOf(el, field);
  if (!prop) return null;
  const places = timeline(state);
  const q = squash(query);
  const mine = sourcesOf(state, el, prop.name);
  const chosen = new Set(mine.map(s => `${s.elementId}|${s.field == null ? '' : fieldKey(s.field)}`));
  const hereIds = new Set(Object.values(state.slices).filter(s => s.elements.includes(elementId)).flatMap(s => s.elements));
  const same = name => fieldKey(name) === fieldKey(prop.name);

  const cards = places.filter(p => p.element.id !== elementId).map(p => {
    const e = p.element, slice = sliceTitle(state.slices[p.sliceId], state);
    const loops = f => reaches(state, { elementId: e.id, field: f }, elementId, prop.name);
    const fields = (e.properties || []).filter(f => isPlainName(f.name) && (chosen.has(`${e.id}|${fieldKey(f.name)}`) || !loops(f.name)))
      .map(f => ({ key: `${e.id}|${fieldKey(f.name)}`, name: f.name, selected: chosen.has(`${e.id}|${fieldKey(f.name)}`), same: same(f.name) }))
      .sort((a, b) => b.same - a.same);
    const wholeOk = isWholeSource(e) && (chosen.has(`${e.id}|`) || !(e.properties || []).some(f => loops(f.name)));
    return { at: p.at, elementId: e.id, sticky: e.name, kind: e.type, slice, here: hereIds.has(e.id), same: fields.some(f => f.same),
      whole: wholeOk ? { key: `${e.id}|`, selected: chosen.has(`${e.id}|`) } : null, fields };
  }).filter(c => c.whole || c.fields.length)
    // Typing keeps the cards whose sticky or slice matches (all their fields) and the fields that match
    .map(c => {
      if (!q) return c;
      const own = squash(`${c.sticky} ${c.slice}`).includes(q) || (c.whole && squash('whole event').includes(q));
      const fields = own ? c.fields : c.fields.filter(f => squash(f.name).includes(q));
      return own || fields.length ? { ...c, fields } : null;
    }).filter(Boolean)
    .sort((a, b) => (b.here - a.here) || (a.here ? a.at - b.at : (b.same - a.same) || a.sticky.localeCompare(b.sticky) || a.at - b.at));

  return {
    elementId, field: prop.name, sticky: el.name, query, canMap: !readOnly,
    sources: mine.map(s => ({ key: `${s.elementId}|${s.field == null ? '' : fieldKey(s.field)}`, elementId: s.elementId, sticky: s.sticky, field: s.field, whole: !!s.whole, text: s.whole ? `${s.sticky} · whole event` : s.text })),
    itemFields: { offered: isList(prop), checked: isList(prop) && (itemsChecked ?? !(prop.items || []).length) },
    more: Math.max(0, cards.length - LIMIT),
    cards: cards.slice(0, LIMIT).map(({ at, ...c }) => c)
  };
}

// The same, read from the book as it is now (a tap asks the open book)
export const fieldMapPickerNow = (elementId, field, opts) => fieldMapPicker(projectState(), elementId, field, opts);
