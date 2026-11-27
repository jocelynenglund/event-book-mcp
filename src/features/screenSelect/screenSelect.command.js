// ===========================================
// SCREEN SELECT - Set Screen Field (SC)
// SC: Set Screen Field — a screen's field is made to pick one or many from a view, to be hidden, or to be required or optional (ScreenFieldSet).
//     The field is added to the screen first when it is not there (a list type for pick-many). The same facts again record nothing.
// SC: Set Screen Fields From Sketch — the screen's text says its fields (pad/padScreen.rules.js): each [ ]{View}, ( ){View}, <hidden>, x* and y? field is set; a field the
//     text said before and no longer says is set back to plain. It is the hook Save Screen Text, Make chapter and Update chapter run after a sketch is set.
// SC: Set Screen Fields From Text — the agent tools' and the plain-text model file's field list ("guests []{Guest List}, <requestId>, size (){Sizes}"): the same, for the screen's fields.
// Each returns null when it recorded what it should, else why it was refused.
// ===========================================

import { appendEvent, EventTypes, canEditCurrent } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { fieldKey, parsePropertyText, splitEntries } from '../../core/constants.js';
import { addProperty } from '../properties/command.js';
import { parseScreen } from '../pad/padScreen.rules.js';
import { screenFieldOf, isScreenField } from './screenSelect.rules.js';

const propOf = (el, name) => (el?.properties || []).find(p => fieldKey(p.name) === fieldKey(name));
const same = (p, w) => (p.select || null) === (w.select || null) && (p.select ? p.optionsFrom === w.from : true) && !!p.hidden === !!w.hidden && p.required === w.required;

// One field of a screen: { name, select?, from?, hidden?, required? }; `plain` takes all of it off
export function setScreenField(elementId, want) {
  if (projectState().elements[elementId]?.type !== 'screen') return 'Only a screen has pick-one, pick-many and hidden fields';
  if (!canEditCurrent()) return 'Read only: check the book out to change a screen';
  const wanted = { ...want, ...(want.hidden ? { select: undefined, from: undefined } : {}) };   // <x> with [] or () is hidden only
  let prop = propOf(projectState().elements[elementId], wanted.name);
  if (!prop) { addProperty(elementId, wanted.name, wanted.select === 'many' && !wanted.hidden ? 'array' : 'string'); prop = propOf(projectState().elements[elementId], wanted.name); }
  if (same(prop, wanted)) return null;
  appendEvent(EventTypes.ScreenFieldSet, { elementId, field: prop.name, select: wanted.select || null, optionsFrom: wanted.select ? wanted.from : null, hidden: !!wanted.hidden, required: typeof wanted.required === 'boolean' ? wanted.required : null });
  return null;
}

// After a sketch is set: (elementId, the sketch before, the sketch now) → why it was refused, or null
export function setScreenFieldsFromSketch(elementId, before, next) {
  const els = projectState().elements;
  if (els[elementId]?.type !== 'screen') return null;
  const says = text => parseScreen(text).inputs.filter(i => i.select || i.hidden || i.required !== undefined);
  const now = says(next), was = says(before);
  for (const i of now) {
    const refused = setScreenField(elementId, { name: i.field, select: i.select, from: i.from, hidden: i.hidden, required: i.required });
    if (refused) return refused;
  }
  for (const i of was.filter(w => !now.some(n => n.field === w.field))) {
    const prop = propOf(projectState().elements[elementId], i.field);
    if (isScreenField(prop)) appendEvent(EventTypes.ScreenFieldSet, { elementId, field: prop.name, select: null, optionsFrom: null, hidden: false, required: null });
  }
  return null;
}

// A field list for a screen: each entry that is one of ours is set, every other is a plain field (as the list says it)
export function setScreenFieldsFromText(elementId, text) {
  const have = () => (projectState().elements[elementId]?.properties || []).map(p => p.name);
  for (const entry of splitEntries(String(text ?? ''))) {
    const ours = screenFieldOf(entry);
    if (ours) { const refused = setScreenField(elementId, ours); if (refused) return refused; continue; }
    parsePropertyText(entry, 'string', have()).parsed.forEach(({ name, type, items }) => addProperty(elementId, name, type, items));
  }
  return null;
}
