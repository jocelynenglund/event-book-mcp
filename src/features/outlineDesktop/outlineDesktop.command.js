// ===========================================
// OUTLINE DESKTOP - Commands (the same writes the phone's sheets make, from boxes in the document)
// SC: Add Scenario Inline — a named scenario on a slice; a slice with one command and one event (or one read model) starts with
//     them in its When and Then, so the boxes are there to fill.
// SC: Edit Scenario Value — one value of a scenario's Given, When or Then (a box), its rejection or nothing-happens reason, or a
//     view's query. An empty box takes the value away; a value keeps its kind (a number stays a number, true/false, a list).
// Each returns the reason it was refused, or null.
// ===========================================

import { projectState } from '../../core/projections.js';
import { addScenario, setGiven, setWhen, setThenEvent, setThenReadModel, setThenRejection, setThenNothing, setQuery } from '../scenarios/command.js';

const only = (els, type) => { const l = els.filter(e => e?.type === type); return l.length === 1 ? l[0] : null; };

export function addScenarioInline(sliceId, name) {
  const text = String(name || '').trim();
  if (!text) return 'Name the scenario first';
  const state = projectState();
  const slice = state.slices[sliceId];
  if (!slice) return 'No such slice';
  const id = addScenario(sliceId, text, slice.type);
  const els = slice.elements.map(e => state.elements[e]).filter(Boolean);
  if (slice.type === 'SV') {
    const model = only(els, 'readModel');
    if (model) setThenReadModel(id, model.id, {});
    return null;
  }
  const command = only(els, 'command'), event = only(els, 'event');
  if (command) setWhen(id, command.id, {});
  if (event) setThenEvent(id, event.id, {});
  return null;
}

// What a box says, as the value it stands for: its old kind, else its field's type
function parsed(text, old, type) {
  const kind = old !== undefined && old !== null ? (Array.isArray(old) ? 'array' : typeof old) : type;
  if (kind === 'number' && /^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (kind === 'boolean' && /^(true|false)$/.test(text)) return text === 'true';
  if ((kind === 'array' || kind === 'object' || /^[\[{]/.test(text)) && /^[\[{]/.test(text)) { try { return JSON.parse(text); } catch (e) { return text; } }
  return text;
}

const withValue = (values, key, text, field) => {
  const next = { ...(values || {}) };
  const t = String(text ?? '').trim();
  if (!t) delete next[key]; else next[key] = parsed(t, next[key], field?.type);
  return next;
};
const same = (a, b) => JSON.stringify(a || {}) === JSON.stringify(b || {});

export function editScenarioValue({ scenarioId, part, key, index = 0, text }) {
  const state = projectState();
  const scn = state.scenarios[scenarioId];
  if (!scn) return 'No such scenario';
  const field = (elementId) => (state.elements[elementId]?.properties || []).find(p => p.name === key);
  const edit = (elementId, values, write) => { const next = withValue(values, key, text, field(elementId)); if (!same(next, values)) write(next); return null; };
  if (part === 'given') {
    const entry = scn.given?.[index];
    if (!entry) return 'No such line';
    return edit(entry.elementId, entry.values, next => setGiven(scenarioId, scn.given.map((g, i) => i === index ? { ...g, values: next } : g)));
  }
  if (part === 'when') return scn.when?.commandId ? edit(scn.when.commandId, scn.when.values, next => setWhen(scenarioId, scn.when.commandId, next)) : 'Pick the command first';
  if (part === 'then') {
    const t = scn.then;
    if (t?.type === 'event') return edit(t.eventId, t.values, next => setThenEvent(scenarioId, t.eventId, next));
    if (t?.type === 'readModel') return edit(t.readModelId, t.values, next => setThenReadModel(scenarioId, t.readModelId, next, t.rows));
    return 'Pick what happens first';
  }
  if (part === 'rejection') { if (scn.then?.type === 'rejection' && scn.then.reason !== text.trim()) setThenRejection(scenarioId, text.trim()); return null; }
  if (part === 'nothing') { if (scn.then?.type === 'nothing' && scn.then.reason !== text.trim()) setThenNothing(scenarioId, text.trim()); return null; }
  if (part === 'query') { if ((scn.when?.query || '') !== text.trim()) setQuery(scenarioId, text); return null; }
  return 'Nothing to change there';
}
