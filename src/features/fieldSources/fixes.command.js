// ===========================================
// FIELD SOURCES - Command: Apply Field Fix
// SC: Apply Field Fix — one of a gap's fixes (see fixes.js for the ids), done as ONE undo-able step: the events it
//     records share a batch. The UI's buttons and the agent tools (apply_fix) both come through here.
//     Add Field: the field (with its type and item fields) goes onto the sticky it comes from.
//     Make A Read Slice: an automation with only a trigger event gets a view slice (its read model, reading that event) and reads it.
//     Draw Event In: an event of the book goes into the slice, wired as a placed sticky is.
//     Map From: the field comes from another sticky's field, or a whole event (map|…|<event>|@event, or @event+items) (Map Field, in fieldMapping); unmap|<sticky>|<field> takes it back (agents' map_field).
//     Set By The System: how it comes about is recorded (Mark Field Set By System).
//     Remove Field: the field is taken off the sticky.
//     Add Plain Field / Pick Button Command: a screen's input, or a field it shows, goes onto the sticky it belongs to; a button is renamed after its command in the sketch.
//     Tidy Fields: fields written as prose are read back into names (see tidy.js).
// Refused (returns why, records nothing): a fix that means nothing, a sticky or slice that is gone, a field already
// there; a book that can't be changed here; and, for an agent, any slice that is ☑ Refined (only the person changes
// those; a person's edit takes Refined back, as any edit does).
// ===========================================

import { canEditCurrent } from '../../core/eventStore.js';
import { projectState, sliceTitle } from '../../core/projections.js';
import { fieldKey } from '../../core/constants.js';
import { addToSlice, addProcessorReadModel } from '../board/command.js';
import { processorTriggers } from '../board/processorReads.js';
import { addProperty, removeProperty, updateProperty } from '../properties/command.js';
import { markFieldSetBySystem } from './command.js';
import { mapField, mapFromWholeEvent, clearFieldMapping, addFieldSource, removeFieldSource } from '../fieldMapping/command.js';
import { tidyOf } from './tidy.js';
import { setScreenSketch } from '../pad/screenSketch.command.js';
import { relabelButton } from '../pad/padScreen.rules.js';

const propOf = (el, field) => (el.properties || []).find(p => fieldKey(p.name) === fieldKey(field));
const slicesOf = (state, elementId) => Object.values(state.slices).filter(s => s.elements.includes(elementId)).map(s => s.id);

// What each kind does: plan(state, ...parts) → why it can't, or { touches: the slices it changes, go() → why not, or null }
const plans = {
  add(state, targetId, fromId, field) {
    const target = state.elements[targetId], from = state.elements[fromId];
    if (!target || !from) return 'No such sticky';
    const prop = propOf(from, field);
    if (!prop) return `${from.name} has no field ${field}`;
    if (propOf(target, field)) return `${target.name} already has ${field}`;
    return { touches: slicesOf(state, targetId), go: () => { addProperty(targetId, prop.name, prop.type || 'string', prop.items || null); return null; } };
  },

  draw(state, sliceId, elementId) {
    const slice = state.slices[sliceId], el = state.elements[elementId];
    if (!slice) return 'No such slice';
    if (!el) return 'No such sticky';
    if (slice.elements.includes(elementId)) return `${el.name} is already in ${sliceTitle(slice, state)}`;
    return { touches: [sliceId], go: () => { addToSlice(sliceId, el.type, { elementId }); return null; } };
  },

  // A view slice for an automation made the older way: its read model "<Processor> to-do", reading the events that wake it,
  // and the processor reads it (an automation pair's own view slice when it has one)
  reads(state, processorId) {
    const proc = state.elements[processorId];
    if (!proc || proc.type !== 'processor') return 'No such sticky';
    const own = slicesOf(state, processorId);
    const home = own.map(id => state.slices[id]).find(s => s.type !== 'SV') || state.slices[own[0]];
    if (!home) return `${proc.name} is on no slice`;
    const events = processorTriggers(state, processorId).map(t => t.id);
    return { touches: own, go: () => {
      const viewId = addProcessorReadModel(home.id, processorId, `${proc.name} to-do`);
      events.filter(id => !projectState().slices[viewId].elements.includes(id)).forEach(id => addToSlice(viewId, 'event', { elementId: id }));
      return null;
    } };
  },

  map(state, elementId, field, fromId, fromField) {
    const el = state.elements[elementId];
    if (!el) return 'No such sticky';
    if (!fromId || !fromField) return 'Say which field it comes from: map|<sticky>|<field>|<from sticky>|<from field>';
    // "@event": from the whole event; "@event+items": and a list gets the event's fields as item fields
    if (/^@event/.test(fromField)) return { touches: slicesOf(state, elementId), go: () => mapFromWholeEvent({ elementId, field, from: fromId, items: fromField === '@event+items', state }) };
    return { touches: slicesOf(state, elementId), go: () => mapField({ elementId, field, from: { elementId: fromId, field: fromField }, state }) };
  },

  // One more source of a field, or exactly one taken away (fromField "@event": the whole event)
  addsource(state, elementId, field, fromId, fromField) {
    if (!state.elements[elementId]) return 'No such sticky';
    const from = { elementId: fromId, field: fromField === '@event' ? null : fromField };
    return { touches: slicesOf(state, elementId), go: () => addFieldSource({ elementId, field, from, state }) };
  },

  dropsource(state, elementId, field, fromId, fromField) {
    if (!state.elements[elementId]) return 'No such sticky';
    const from = { elementId: fromId, field: fromField === '@event' ? null : fromField };
    return { touches: slicesOf(state, elementId), go: () => removeFieldSource({ elementId, field, from, state }) };
  },

  unmap(state, elementId, field) {
    if (!state.elements[elementId]) return 'No such sticky';
    return { touches: slicesOf(state, elementId), go: () => clearFieldMapping({ elementId, field, state }) };
  },

  system(state, elementId, field, how) {
    const el = state.elements[elementId];
    if (!el) return 'No such sticky';
    return { touches: slicesOf(state, elementId), go: () => markFieldSetBySystem({ elementId, field, how, state }) };
  },

  remove(state, elementId, field) {
    const el = state.elements[elementId];
    if (!el) return 'No such sticky';
    const prop = propOf(el, field);
    if (!prop) return `${el.name} has no field ${field}`;
    return { touches: slicesOf(state, elementId), go: () => { removeProperty(elementId, prop.id); return null; } };
  },

  field(state, targetId, field) {
    const target = state.elements[targetId];
    if (!target) return 'No such sticky';
    if (propOf(target, field)) return `${target.name} already has ${field}`;
    return { touches: slicesOf(state, targetId), go: () => { addProperty(targetId, field, 'string', null); return null; } };
  },

  button(state, screenId, label, commandId) {
    const screen = state.elements[screenId], command = state.elements[commandId];
    if (screen?.type !== 'screen' || !command) return 'No such sticky';
    return { touches: slicesOf(state, screenId), go: () => setScreenSketch(screenId, relabelButton(screen.sketch, label, command.name)) };
  },

  tidy(state, elementId) {
    const el = state.elements[elementId];
    if (!el) return 'No such sticky';
    const groups = tidyOf(el);
    if (!groups) return `${el.name} has no fields to tidy`;
    return { touches: slicesOf(state, elementId), go: () => {
      groups.forEach(g => {
        const [first, ...rest] = g.ids;
        if (g.gone) removeProperty(elementId, first);
        else updateProperty(elementId, first, { name: g.name, propertyType: g.type || 'string', items: g.items });
        rest.forEach(id => removeProperty(elementId, id));
      });
      return null;
    } };
  }
};

// fixId: one of the ids in fixes.js. how: for Set By The System. agent: who is asking is an agent, not the person.
// Returns why it was refused, or null.
export function applyFix(fixId, { how = '', agent = false, state = projectState() } = {}) {
  const [kind, ...parts] = String(fixId).split('|');
  const plan = Object.hasOwn(plans, kind) ? plans[kind](state, ...parts, ...(kind === 'system' ? [how] : [])) : 'No such fix';
  if (typeof plan === 'string') return plan;
  if (agent) {
    const refined = plan.touches.map(id => state.slices[id]).find(s => s?.refined);
    if (refined) return `${sliceTitle(refined, state)} is refined: only the person changes it`;
  }
  if (!canEditCurrent()) return 'Read only';
  return plan.go();
}
