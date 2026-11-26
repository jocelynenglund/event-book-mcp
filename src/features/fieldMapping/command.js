// ===========================================
// FIELD MAPPING - Commands
// SC: Map Field — a field comes from another sticky's field ("orderRef ← Order Placed.orderId"), or from a whole event
//     (from.field null: "products[] ← each ProductConfigured"): it has a source. A list's item field is "products[].frameId".
//     Refused: a sticky or field that isn't there, a field from itself, a loop (A.x ← B.y ← A.x), the same mapping
//     again (changes nothing). Another source replaces the first. Undo takes it back.
// SC: Clear Field Mapping — it comes from nowhere again.
// Neither is an edit to the slice (they answer a hint, they don't change the plan), so Refined stays.
// Each returns why it was refused, or null.
// ===========================================

import { appendEvent, EventTypes } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { fieldKey } from '../../core/constants.js';
import { updateProperty } from '../properties/command.js';
import { fieldOf, isList, isWholeSource, itemField, propOf, reaches } from './mappings.js';
import { isPlainName } from '../fieldSources/tidy.js';

const record = (type, data) => (appendEvent(type, data) ? null : 'Read only');

export function mapField({ elementId, field, from, state = projectState() } = {}) {
  const el = state.elements[elementId], source = state.elements[from?.elementId];
  if (!el || !source) return 'No such sticky';
  const target = fieldOf(el, field);
  if (!target) return `${el.name} has no field ${field}`;
  const wholeEvent = from.field == null;
  if (wholeEvent) {
    // From a whole event: { elementId, field: null }
    if (!isWholeSource(source)) return `${source.name} is not an event: only an event can be a whole source`;
    if (el.id === source.id) return 'A field cannot come from its own event';
    const loops = (source.properties || []).find(p => reaches(state, { elementId: source.id, field: p.name }, el.id, target.name));
    if (loops) return `That would make a loop: ${source.name}.${loops.name} already comes from ${el.name}.${target.name}`;
    const was = el.mappings?.[fieldKey(target.name)]?.from;
    if (was && was.elementId === source.id && was.field == null) return `already comes from ${source.name}`;
    return record(EventTypes.FieldMapped, { elementId, field: target.name, from: { elementId: source.id, field: null } });
  }
  const fromProp = propOf(source, from.field);
  if (!fromProp) return `${source.name} has no field ${from.field}`;
  if (el.id === source.id && fieldKey(target.name) === fieldKey(fromProp.name)) return 'A field cannot come from itself';
  if (reaches(state, { elementId: source.id, field: fromProp.name }, el.id, target.name)) return `That would make a loop: ${source.name}.${fromProp.name} already comes from ${el.name}.${target.name}`;
  const was = el.mappings?.[fieldKey(target.name)]?.from;
  if (was && was.elementId === source.id && fieldKey(was.field) === fieldKey(fromProp.name)) return `already comes from ${source.name}.${fromProp.name}`;
  return record(EventTypes.FieldMapped, { elementId, field: target.name, from: { elementId: source.id, field: fromProp.name } });
}

// SC: Map From Whole Event — a field comes from a whole event ("products[] ← each ProductConfigured"). For a list, items: true
// also gives it the event's fields as item fields (the ones it has already stay) and maps each item field to the event's
// field of that name. All of it is one action, one undo. Refused as Map Field is: then nothing is added.
export function mapFromWholeEvent({ elementId, field, from, items = false, state = projectState() } = {}) {
  const why = mapField({ elementId, field, from: { elementId: from, field: null }, state });
  if (why) return why;
  const el = state.elements[elementId], source = state.elements[from], prop = propOf(el, field);
  if (!items || !isList(prop)) return null;
  const eventFields = (source.properties || []).filter(p => isPlainName(p.name));
  const have = prop.items || [];
  const added = eventFields.filter(p => !have.some(i => fieldKey(i) === fieldKey(p.name))).map(p => p.name);
  if (added.length) updateProperty(elementId, prop.id, { name: prop.name, propertyType: 'array', items: [...have, ...added] });
  const now = projectState();
  for (const item of [...have, ...added]) {
    const own = eventFields.find(p => fieldKey(p.name) === fieldKey(item));
    if (!own) continue;
    const why = mapField({ elementId, field: itemField(prop, item), from: { elementId: from, field: own.name }, state: now });
    if (why && !/^already comes from/.test(why)) return why;
  }
  return null;
}

export function clearFieldMapping({ elementId, field, state = projectState() } = {}) {
  const el = state.elements[elementId];
  if (!el) return 'No such sticky';
  const m = el.mappings?.[fieldKey(field)];
  if (!m) return `${field} does not come from another field`;
  return record(EventTypes.FieldMappingCleared, { elementId, field: m.field });
}
