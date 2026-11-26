// ===========================================
// VIEW QUERIES - Commands
// SC: Mark Field Query — a read model's field is a query parameter: the caller asks the view with it, so it comes from
//     no event and is never a gap. Marking it again changes nothing.
// SC: Clear Field Query — it is an ordinary field again.
// Neither is an edit to the slice's plan beyond a mark on a field (like Set By System), so Refined stays.
// Each returns why it was refused, or null.
// ===========================================

import { appendEvent, EventTypes } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { fieldKey } from '../../core/constants.js';
import { isQueryField } from './queryFields.js';

const record = (type, data) => (appendEvent(type, data) ? null : 'Read only');

export function markFieldQuery({ elementId, field, state = projectState() } = {}) {
  const el = state.elements[elementId];
  if (!el) return 'No such sticky';
  if (el.type !== 'readModel') return `${el.name} is not a read model: only a view's field can be a query parameter`;
  const prop = (el.properties || []).find(p => fieldKey(p.name) === fieldKey(field));
  if (!prop) return `${el.name} has no field ${field}`;
  if (el.queryFields?.[fieldKey(field)]) return `${prop.name} is already a query parameter`;
  return record(EventTypes.FieldMarkedQuery, { elementId, field: prop.name });
}

export function clearFieldQuery({ elementId, field, state = projectState() } = {}) {
  const el = state.elements[elementId];
  if (!el) return 'No such sticky';
  if (!el.queryFields?.[fieldKey(field)]) return `${field} is not a query parameter`;
  return record(EventTypes.FieldQueryCleared, { elementId, field: el.queryFields[fieldKey(field)].field });
}

// A list of fields as written ("?name, place": parsePropertyText's entries, query: true on the ones with a ?) put on a read
// model: those are query parameters now (clear: the others are not any more). Other stickies have no query parameters.
// Returns how many marks changed.
export function setQueryFields(elementId, fields, { clear = false } = {}) {
  const el = projectState().elements[elementId];
  if (el?.type !== 'readModel') return 0;
  let changed = 0;
  fields.forEach(f => {
    const marked = isQueryField(el, f.name);
    if (f.query && !marked) { appendEvent(EventTypes.FieldMarkedQuery, { elementId, field: f.name }); changed++; }
    else if (clear && !f.query && marked) { appendEvent(EventTypes.FieldQueryCleared, { elementId, field: f.name }); changed++; }
  });
  return changed;
}
