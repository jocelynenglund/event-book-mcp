// ===========================================
// FIELD MAPPING - Sticky Field Mappings (SV)
// The stickies of one slice that have a field coming from another sticky's field, each field saying where from:
// { elementId, sticky, fields: [{ name, from: { elementId, sticky, field, text } }] }. The board and the slice page
// show "orderRef ← Order Placed.orderId" from it. A mapping whose source is gone (the sticky or its field) says nothing.
// ===========================================

import { mappingOf } from './mappings.js';

export function stickyFieldMappings(state, sliceId) {
  const slice = state.slices[sliceId];
  if (!slice) return [];
  return slice.elements.map(id => state.elements[id]).filter(Boolean).map(el => ({
    elementId: el.id, sticky: el.name,
    fields: (el.properties || []).map(p => ({ name: p.name, from: mappingOf(state, el, p.name)?.from })).filter(f => f.from)
  })).filter(s => s.fields.length);
}

// The field's source as the card says it, or null (the card hands a field's name; the view says where it comes from)
export const mappedFrom = (mappings, elementId, name) => mappings.find(m => m.elementId === elementId)?.fields.find(f => f.name === name)?.from || null;
