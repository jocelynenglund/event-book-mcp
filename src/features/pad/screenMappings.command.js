// ===========================================
// PAD - Map screen fields
// SC: Map Screen Fields — a screen's text says how its fields are mapped (screenMappings.rules.js): each [ Input ] goes to the command its
//     ( Button ) sends, each { View: a, b } puts the view's fields on the screen. The screen and the command carry the field first (a field a mapping
//     names must be on its sticky), then it is mapped (FieldMapped); what the text no longer says is cleared (FieldMappingCleared). A mapping there is
//     already, or one that comes from somewhere else, is left as it is. Neither is an edit to the slice's plan, so Refined stays (mapField's rule).
// Returns null when it recorded what it should (or there was nothing to do), else why it was refused.
// ===========================================

import { projectState } from '../../core/projections.js';
import { addProperty } from '../properties/command.js';
import { mapField, clearFieldMapping } from '../fieldMapping/command.js';
import { propOf } from '../fieldMapping/mappings.js';
import { planScreenMappings } from './screenMappings.rules.js';

export function mapScreenFields(screenId) {
  const state = projectState();
  if (state.elements[screenId]?.type !== 'screen' || !state.elements[screenId].sketch) return null;
  const { map, clear } = planScreenMappings(state, screenId);
  for (const m of map.filter(x => !x.have)) {
    [m.elementId, m.from.elementId].forEach(id => propOf(projectState().elements[id], m.field) || addProperty(id, m.field, m.many ? 'array' : 'string'));   // feature: screen-select (a pick-many field is a list)
    const why = mapField({ elementId: m.elementId, field: m.field, from: m.from });
    if (why && !/^already comes from/.test(why)) return why;
  }
  for (const c of clear) {
    const why = clearFieldMapping({ elementId: c.elementId, field: c.field });
    if (why) return why;
  }
  return null;
}

// Every screen a slice has: Make chapter and Update chapter map each once the whole batch is in place
export function mapScreensOf(sliceIds) {
  const state = projectState();
  const screens = [...new Set(sliceIds.flatMap(id => (state.slices[id]?.elements || []).filter(e => state.elements[e]?.type === 'screen')))];
  for (const id of screens) {
    const why = mapScreenFields(id);
    if (why) return why;
  }
  return null;
}
