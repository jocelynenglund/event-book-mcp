// ===========================================
// FIELD SOURCES - Commands
// SC: Mark Field Set By System — a field with no source in the model on purpose (an id, the clock, a value computed
//     from others): it stops being a gap. Marking again with the same how changes nothing; another how replaces it.
// SC: Clear Field Set By System — it needs a source again.
// Neither is an edit to the slice (they answer a hint, they don't change the plan), so Refined stays.
// Each returns why it was refused, or null.
// ===========================================

import { appendEvent, EventTypes } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { fieldKey } from '../../core/constants.js';

const record = (type, data) => (appendEvent(type, data) ? null : 'Read only');
const fieldOf = (el, name) => (el.properties || []).find(p => fieldKey(p.name) === fieldKey(name));

export function markFieldSetBySystem({ elementId, field, how = '', state = projectState() } = {}) {
  const el = state.elements[elementId];
  if (!el) return 'No such sticky';
  const prop = fieldOf(el, field);
  if (!prop) return `${el.name} has no field ${field}`;
  const why = String(how || '').trim() || 'the system';
  if (el.setBySystem?.[fieldKey(field)]?.how === why) return 'already set by the system';
  return record(EventTypes.FieldSetBySystem, { elementId, field: prop.name, how: why });
}

export function clearFieldSetBySystem({ elementId, field, state = projectState() } = {}) {
  const el = state.elements[elementId];
  if (!el) return 'No such sticky';
  if (!el.setBySystem?.[fieldKey(field)]) return `${field} is not set by the system`;
  return record(EventTypes.FieldSetBySystemCleared, { elementId, field: el.setBySystem[fieldKey(field)].field });
}
