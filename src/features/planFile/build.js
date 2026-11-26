// ===========================================
// PLAN FILE - steps, scenarios and whole plans built with Event Book's own commands
// One place for what the MCP's add_steps / add_scenarios do and what ☰ → Import does with an
// "eventbook-plan/1" file (plan.schema.json, plan.example.json): a plan is chapters of steps
// (do / see / auto), each step with its scenarios inline. Stickies with the same name are the
// same sticky. No sheets, no toasts: the caller says what happened.
// ===========================================

import * as es from '../../core/eventStore.js';
import * as pr from '../../core/projections.js';
import * as c from '../board/command.js';
import * as sc from '../scenarios/command.js';
import * as ol from '../outline/command.js';
import { parseFieldList } from '../fieldMapping/fieldText.js';
import { addFieldSource } from '../fieldMapping/command.js';
import { propOf } from '../fieldMapping/mappings.js';
import { parseRows } from '../viewQueries/query.js';
import { fieldKey, parsePropertyText } from '../../core/constants.js';

export const PLAN_FORMAT = 'eventbook-plan/1';

const state = () => pr.projectState();

// The same sticky by name is reused (as the outline does)
const as = (type, name) => {
  const same = ol.findByName(type, name, state());
  return same ? { elementId: same.id } : { name: name.trim() };
};
export { as as stickyNamed };
const list = v => (Array.isArray(v) ? v : v ? [v] : []);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// An event is a name, or { name, table?, external?, published?, to? }: table is the legacy table's name (the event is really
// an old table read as events), external says another system records it, published says it is one of ours that is
// published to other systems (an integration event, a contract) and `to` names who consumes it. On a do / see step, `table`,
// `published` and `to` beside the event are shorthand for its one event, and `external` for its events; an auto step writes
// them per event.
const eventKeys = ['name', 'table', 'external', 'published', 'to'];
const flagError = (table, external, published, to) => {
  if (table !== undefined && (typeof table !== 'string' || !table.trim())) return "table must be the table's name";
  if (external !== undefined && typeof external !== 'boolean') return 'external must be true or false';
  if (published !== undefined && typeof published !== 'boolean') return 'published must be true or false';
  if (to !== undefined && (!Array.isArray(to) || !to.length || to.some(n => typeof n !== 'string' || !n.trim()))) return 'to is a list of the systems that consume the event, e.g. ["Billing"]';
  if (to !== undefined && !published) return 'to needs published: true (an integration event goes to other systems)';
  if (published && external) return 'An external event comes from another system: it cannot also be published (an integration event is one of ours)';
  return null;
};
// [{ name, table?, external?, published?, to? }] from the step's events; throws one line when something is off
function eventSpecs(entries, shorthand = {}) {
  const specs = list(entries).map(e => {
    if (typeof e === 'string') return { name: e };
    if (!isObj(e)) throw new Error('An event is a name or {name, table, external, published, to}');
    const odd = Object.keys(e).filter(k => !eventKeys.includes(k));
    if (odd.length) throw new Error(`An event takes ${eventKeys.join(', ')}; not ${odd.join(', ')}`);
    if (typeof e.name !== 'string' || !e.name.trim()) throw new Error('Every event needs a name');
    const bad = flagError(e.table, e.external, e.published, e.to);
    if (bad) throw new Error(bad);
    return { ...e };
  });
  const { table, external, published, to } = shorthand;
  const bad = flagError(table, external, published, to);
  if (bad) throw new Error(bad);
  if (published !== undefined || to !== undefined) {
    if (specs.length !== 1) throw new Error(specs.length ? 'published on a step with several events: write each event as {name, published, to}' : 'published needs an event on the step');
    specs[0].published = published;
    if (to !== undefined) specs[0].to = to;
  }
  if (table !== undefined) {
    if (specs.length !== 1) throw new Error(specs.length ? 'table on a step with several events: write each event as {name, table}' : 'table needs an event on the step');
    specs[0].table = table;
  }
  if (external !== undefined) specs.forEach(e => { e.external = external; });
  specs.forEach(e => { if (e.published && e.external) throw new Error(flagError(undefined, true, true)); });
  return specs;
}
// Marks are set once: a sticky that already has them is left alone
function markEvent(id, { table, external, published, to }) {
  const el = state().elements[id];
  if (table && el?.table !== table) es.appendEvent(es.EventTypes.ElementTableSet, { elementId: id, table });
  if (external && !el?.external) es.appendEvent(es.EventTypes.ElementExternalSet, { elementId: id, external: true });
  if (published) c.setPublished(id, true, to || []);
}
const addEvents = (sliceId, specs) => specs.forEach(e => markEvent(c.addToSlice(sliceId, 'event', as('event', e.name)), e));

// The first thing wrong with a step's marks (table, external, published, list), as one line; null when fine
export function checkStepMarks(step) {
  try {
    const kind = String(step.kind || '').toLowerCase();
    if (step.list !== undefined && typeof step.list !== 'boolean') return 'list must be true or false';
    if (step.list && kind !== 'see') return 'list belongs on a see step (its read model)';
    if (kind === 'auto') {
      if (step.table !== undefined) return 'table does not say which event on an auto step: on an auto step, write the event as {name, table}';
      if (step.external !== undefined && typeof step.external !== 'boolean') return 'external must be true or false';
      if (step.published !== undefined || step.to !== undefined) return 'published does not say which event on an auto step: on an auto step, write the event as {name, published, to}';
      if (list(step.when).length > 1) return 'An auto step has one "when" event';
      eventSpecs(step.when); eventSpecs(step.events || step.result);
    } else eventSpecs(step.events || step.event, { table: step.table, external: step.external, published: step.published, to: step.to });
    return null;
  } catch (e) { return e.message; }
}

// ---------- Fields that come from another sticky's: "orderRef ← Order Placed.orderId" ----------

// The stickies of the book called this (any kind, any case)
const stickiesNamed = (name, st = state()) => Object.values(st.elements).filter(e => e.name.trim().toLowerCase() === String(name).trim().toLowerCase());

// The sticky a mapping names: the one called that which carries the field. Throws one line when there isn't exactly one.
function sourceOf(sticky, field, st = state()) {
  const named = stickiesOrThrow(sticky, st);
  const carrying = named.filter(e => propOf(e, field));
  if (!carrying.length) throw new Error(`${named[0].name} has no field ${field}`);
  if (carrying.length > 1) throw new Error(`${carrying.length} stickies are called "${sticky}" and carry ${field} (${carrying.map(e => e.type).join(', ')}): rename one`);
  return carrying[0];
}
// The event a whole-event mapping names: the one called that. Throws one line when there isn't exactly one event of that name.
function eventOf(sticky, st = state()) {
  const named = stickiesOrThrow(sticky, st).filter(e => e.type === 'event');
  if (!named.length) throw new Error(`"${sticky}" is not an event: a whole source is an event`);
  if (named.length > 1) throw new Error(`${named.length} events are called "${sticky}": rename one`);
  return named[0];
}
function stickiesOrThrow(sticky, st) {
  const named = stickiesNamed(sticky, st);
  if (!named.length) throw new Error(`No sticky "${sticky}" (a field can come from the field of a sticky that is already in the book)`);
  return named;
}

// The stickies a step makes, and which of them carry its fields (a change: its command and events; a view: its read model)
const eventNames = v => list(v).map(e => (typeof e === 'string' ? e : e?.name)).filter(n => typeof n === 'string' && n.trim());
function stepStickies(step) {
  const kind = String(step.kind || '').toLowerCase();
  const events = eventNames(step.events || step.event || step.result);
  if (kind === 'see') return { names: [...events, step.readModel, step.screen], carriers: [step.readModel] };
  if (kind === 'auto') return { names: [step.processor, step.command, step.using, ...eventNames(step.when), ...events], carriers: [step.command, ...events] };
  return { names: [step.screen, step.command, ...events], carriers: [step.command, ...events] };
}

// What is wrong with a step's fields that come from another's, before anything is added: the source sticky or field
// isn't in the book (a sticky this very step makes is checked once it is there); null when fine
function checkFieldMappings(step) {
  const { mappings, error } = parseFieldList(step.fields);
  if (error) return error;
  const own = new Set(stepStickies(step).names.filter(Boolean).map(n => n.trim().toLowerCase()));
  for (const m of mappings) {
    if (!stickiesNamed(m.sticky).length && own.has(m.sticky.toLowerCase())) continue;
    try { if (m.from === null) eventOf(m.sticky); else sourceOf(m.sticky, m.from); } catch (e) { return e.message; }
  }
  return null;
}

// A step's (or slice's) fields: the names go on its stickies, and each "field ← Sticky.field" maps the field on every sticky of
// the slice that carries it (but the source itself). Throws the first mapping that can't be made.
export function addFields(sliceId, fields) {
  const { text, mappings, error } = parseFieldList(fields);
  if (error) throw new Error(error);
  ol.addOutlineProperties(sliceId, text);
  mappings.forEach(m => {
    const source = m.from === null ? eventOf(m.sticky) : sourceOf(m.sticky, m.from);
    ol.sliceCarriers(sliceId, state()).filter(el => el.id !== source.id && propOf(el, m.field)).forEach(el => {
      const why = addFieldSource({ elementId: el.id, field: m.field, from: { elementId: source.id, field: m.from } });
      if (why && !/^already comes from/.test(why)) throw new Error(why);
    });
  });
}

export function addStep(step, chId) {
  const kind = String(step.kind || '').toLowerCase();
  const marks = checkStepMarks(step);
  if (marks) throw new Error(marks);
  const mapping = checkFieldMappings(step);
  if (mapping) throw new Error(mapping);
  let sliceId;
  if (kind === 'do') {
    if (!step.command) throw new Error('A Do step needs a command');
    sliceId = c.createSlice('SC', step.name || null, { chapterId: chId });
    if (step.screen) c.addToSlice(sliceId, 'screen', as('screen', step.screen));
    c.addToSlice(sliceId, 'command', as('command', step.command));
    addEvents(sliceId, eventSpecs(step.events || step.event, step));
  } else if (kind === 'see') {
    if (!step.readModel) throw new Error('A See step needs a readModel');
    sliceId = c.createSlice('SV', step.name || null, { chapterId: chId });
    addEvents(sliceId, eventSpecs(step.events || step.event, step));
    const rmId = c.addToSlice(sliceId, 'readModel', as('readModel', step.readModel));
    if (step.list && !state().elements[rmId]?.list) es.appendEvent(es.EventTypes.ElementListSet, { elementId: rmId, list: true });
    if (step.screen) c.addToSlice(sliceId, 'screen', as('screen', step.screen));
  } else if (kind === 'auto') {
    sliceId = addAutomation(step, chId);
  } else throw new Error(`Step kind "${step.kind}": use do, see or auto`);
  if (step.fields) addFields(sliceId, step.fields);
  if (step.description) c.describeSlice(sliceId, step.description);
  return sliceId;
}

// When [event] using [read model] ⚙ [processor] does [command] → [result] (the outline's Auto). A translator (the Pad's automation note
// that turns what it reads into an event of its own) has no command: its result events are all it makes.
function addAutomation(step, chId) {
  if (!step.processor || !(step.command || eventNames(step.events || step.result).length)) throw new Error('An Auto step needs a processor and a command (or the events it translates into)');
  const st = state();
  const [when] = eventSpecs(step.when, { external: step.external });
  let triggerId = when ? ol.findByName('event', when.name, st)?.id : null;
  if (when && !triggerId) {
    triggerId = c.newId('el');
    es.appendEvent(es.EventTypes.ElementCreated, { elementId: triggerId, elementType: 'event', name: when.name.trim() });
  }
  if (triggerId) markEvent(triggerId, when);
  const known = step.using ? ol.findByName('readModel', step.using, st) : null;
  let sliceId, viewId = null;
  if (step.using && !known) {
    viewId = c.createAutomation(step.name || null, chId);
    sliceId = state().slices[viewId].pairWith;
  } else sliceId = c.createSlice('SC', step.name || null, { actor: 'processor', chapterId: chId });
  const procId = c.addToSlice(viewId || sliceId, 'processor', as('processor', step.processor));
  if (viewId) {
    const rmId = c.addToSlice(viewId, 'readModel', { name: step.using.trim() });
    if (triggerId) c.addToSlice(viewId, 'event', { elementId: triggerId });
    if (step.todo) c.setTodo(rmId, true);
  } else if (known) {
    c.linkReads(procId, known.id);
    if (step.todo && !known.todo) c.setTodo(known.id, true);
  }
  if (step.command) c.addToSlice(sliceId, 'command', as('command', step.command));
  addEvents(sliceId, eventSpecs(step.events || step.result));
  if (triggerId) c.setTrigger(triggerId, procId, true);
  return sliceId;
}

// An event / read model by name: the model's, or a new sticky (not on the board) when it has none
export function elementByName(type, name) {
  const hit = ol.findByName(type, name, state());
  if (hit) return hit.id;
  const id = c.newId('el');
  es.appendEvent(es.EventTypes.ElementCreated, { elementId: id, elementType: type, name: name.trim() });
  return id;
}

// A scenario in another shape would be dropped without a word: refuse it instead
const scenarioKeys = ['name', 'given', 'when', 'then', 'mustHave'];
export function checkScenario(x) {
  const odd = Object.keys(x || {}).filter(k => !scenarioKeys.includes(k));
  if (odd.length) throw new Error(`A scenario takes ${scenarioKeys.join(', ')}; not ${odd.join(', ')}`);
  if (!x.name) throw new Error('Every scenario needs a name');
  if (x.given !== undefined && !Array.isArray(x.given)) throw new Error(`${x.name}: given is a list of {event, values}`);
  (x.given || []).forEach(g => { if (!g?.event) throw new Error(`${x.name}: each given needs an event`); });
  if (x.when !== undefined) {
    if (typeof x.when !== 'object' || Array.isArray(x.when)) throw new Error(`${x.name}: when is {values, command?} (a view: {query})`);
    const bad = Object.keys(x.when).filter(k => !['values', 'command', 'query'].includes(k));
    if (bad.length) throw new Error(`${x.name}: when is {values, command?}; put ${bad.join(', ')} inside values (a view's when is {query})`);
    if (x.when.query !== undefined && (typeof x.when.query !== 'string' || /[\r\n]/.test(x.when.query.trim()))) throw new Error(`${x.name}: a query is one line of text, such as "name starts with a"`);
  }
  if (x.then?.rows !== undefined) {
    const r = typeof x.then.rows === 'string' ? parseRows(x.then.rows) : Array.isArray(x.then.rows) ? {} : { error: 'rows is a list of rows, or text with a row per line ("- name: anna, place: 1")' };
    if (r.error) throw new Error(`${x.name}: ${r.error}`);
  }
  if (x.then !== undefined && (typeof x.then !== 'object' || Array.isArray(x.then))) throw new Error(`${x.name}: then is one {event, values}, {rejected}, {nothing} or {readModel?, values | rows}`);
  const tk = Object.keys(x.then || {}).filter(k => !['event', 'values', 'rejected', 'nothing', 'readModel', 'rows'].includes(k));
  if (tk.length) throw new Error(`${x.name}: then takes event, values, rejected, nothing, readModel or rows; not ${tk.join(', ')}`);
  // nothing: the command is accepted but changes nothing (an idempotent command); its reason says why, in one line
  if (x.then && 'nothing' in x.then) {
    if (typeof x.then.nothing !== 'string' || !x.then.nothing.trim()) throw new Error(`${x.name}: nothing needs a reason, one line saying why nothing happens`);
    if (/[\r\n]/.test(x.then.nothing.trim())) throw new Error(`${x.name}: the reason for nothing is one line`);
    if (['event', 'rejected', 'readModel', 'rows', 'values'].some(k => k in x.then)) throw new Error(`${x.name}: nothing cannot go with event, rejected or readModel: it is its own outcome (accepted, changes nothing)`);
  }
}

// The rows of a view's Then: a list of {field: value}, or text with a row per line ("- name: anna, place: 1")
const rowsOf = rows => (typeof rows === 'string' ? parseRows(rows).rows : rows || null);

export function addScenario(slice, x) {
  const st = state();
  const query = (x.when?.query || '').trim();
  if (query && slice.type !== 'SV') throw new Error(`${x.name}: a query asks a view (a See slice); ${pr.sliceTitle(slice, st)} is not one`);
  const own = type => slice.elements.map(id => st.elements[id]).filter(e => e?.type === type);
  const id = sc.addScenario(slice.id, x.name, slice.type === 'SV' ? 'SV' : 'SC');
  if (x.mustHave) sc.setMustHave(id, true);
  if (x.given?.length) sc.setGiven(id, x.given.map(g => ({ elementId: elementByName('event', g.event), values: g.values || {} })));
  if (query) sc.setQuery(id, query);
  if (slice.type !== 'SV') {
    const cmd = x.when?.command ? ol.findByName('command', x.when.command, st) : own('command')[0];
    if (cmd) sc.setWhen(id, cmd.id, x.when?.values || {});
  }
  const t = x.then || {};
  if (t.nothing) sc.setThenNothing(id, t.nothing.trim());
  else if (t.rejected) sc.setThenRejection(id, t.rejected);
  else if (t.event) sc.setThenEvent(id, elementByName('event', t.event), t.values || {});
  else if (t.readModel || slice.type === 'SV') {
    const rm = t.readModel ? elementByName('readModel', t.readModel) : own('readModel')[0]?.id;
    if (rm) sc.setThenReadModel(id, rm, t.values || {}, rowsOf(t.rows));
  }
  return id;
}

export function chapterId(name, st = state()) {
  if (!name) return null;
  const hit = Object.values(st.chapters).find(ch => ch.name.toLowerCase() === name.trim().toLowerCase());
  return hit ? hit.id : c.createChapter(name.trim());
}

// ---------- A whole plan file ----------

const stepKeys = ['kind', 'name', 'description', 'screen', 'command', 'event', 'events', 'readModel', 'when', 'external', 'table', 'published', 'to', 'list', 'using', 'todo', 'processor', 'result', 'fields', 'scenarios'];
const planKeys = ['format', '$schema', 'name', 'description', 'chapters'];
const chapterKeys = ['name', 'steps'];

// A step's "field ← Sticky.field" against what the steps before it (and it) make: known maps each sticky's name (lower case) to
// its field names. It takes this step's stickies and fields in, then says what is wrong with its mappings; null when fine.
function checkStepFieldMappings(step, known) {
  // The events the steps so far make or react to (a whole source has to be one of them)
  const events = known.events ||= new Set();
  const own = [...eventNames(step.events || step.event || step.result), ...eventNames(step.when)].map(n => n.trim().toLowerCase());
  own.forEach(n => events.add(n));
  if (step.fields === undefined) { stepStickies(step).names.filter(Boolean).forEach(n => known.has(n.trim().toLowerCase()) || known.set(n.trim().toLowerCase(), new Set())); return null; }
  const { text, mappings, error } = parseFieldList(step.fields);
  if (error) return error;
  const { names, carriers } = stepStickies(step);
  names.filter(Boolean).forEach(n => known.has(n.trim().toLowerCase()) || known.set(n.trim().toLowerCase(), new Set()));
  const fields = parsePropertyText(text, 'string').parsed.map(p => fieldKey(p.name));
  carriers.filter(Boolean).forEach(n => fields.forEach(f => known.get(n.trim().toLowerCase()).add(f)));
  for (const m of mappings) {
    const have = known.get(m.sticky.toLowerCase());
    if (!have) return `no sticky "${m.sticky}" in an earlier step to take ${m.field} from`;
    if (m.from === null) { if (!events.has(m.sticky.toLowerCase())) return `"${m.sticky}" is not an earlier event: a whole source is an event`; continue; }
    if (!have.has(fieldKey(m.from))) return `${m.sticky} has no field ${m.from}`;
  }
  return null;
}

// Is this plan file buildable? The first thing wrong, as one line naming the chapter and step; null when fine.
export function checkPlan(plan) {
  if (!isObj(plan) || plan.format !== PLAN_FORMAT) return `Not an Event Book plan: "format" must be "${PLAN_FORMAT}"`;
  const odd = Object.keys(plan).filter(k => !planKeys.includes(k));
  if (odd.length) return `A plan takes ${planKeys.filter(k => k !== '$schema').join(', ')}; not ${odd.join(', ')}`;
  if (typeof plan.name !== 'string' || !plan.name.trim()) return 'The plan needs a "name"';
  if (!Array.isArray(plan.chapters) || !plan.chapters.length) return 'The plan needs "chapters": a list with at least one chapter';
  const known = new Map();   // the stickies the steps so far make → the fields they carry
  for (const [ci, ch] of plan.chapters.entries()) {
    if (!isObj(ch)) return `Chapter ${ci + 1} is not an object`;
    if (typeof ch.name !== 'string' || !ch.name.trim()) return `Chapter ${ci + 1} needs a "name"`;
    const where = `Chapter "${ch.name}"`;
    const codd = Object.keys(ch).filter(k => !chapterKeys.includes(k));
    if (codd.length) return `${where} takes ${chapterKeys.join(', ')}; not ${codd.join(', ')}`;
    if (!Array.isArray(ch.steps) || !ch.steps.length) return `${where} needs "steps": a list with at least one step`;
    for (const [si, step] of ch.steps.entries()) {
      const at = `${where}, step ${si + 1}${isObj(step) && (step.name || step.command || step.readModel) ? ` (${step.name || step.command || step.readModel})` : ''}`;
      if (!isObj(step)) return `${at} is not an object`;
      const sodd = Object.keys(step).filter(k => !stepKeys.includes(k));
      if (sodd.length) return `${at}: a step takes ${stepKeys.join(', ')}; not ${sodd.join(', ')}`;
      const kind = String(step.kind || '').toLowerCase();
      if (!['do', 'see', 'auto'].includes(kind)) return `${at}: kind "${step.kind ?? ''}" is not do, see or auto`;
      if (kind === 'do' && !step.command) return `${at}: a do step needs a command`;
      if (kind === 'see' && !step.readModel) return `${at}: a see step needs a readModel`;
      if (kind === 'auto' && (!step.processor || !step.command)) return `${at}: an auto step needs a processor and a command`;
      const marks = checkStepMarks(step);
      if (marks) return `${at}: ${marks}`;
      const mapping = checkStepFieldMappings(step, known);
      if (mapping) return `${at}: ${mapping}`;
      if (step.scenarios !== undefined && !Array.isArray(step.scenarios)) return `${at}: scenarios is a list`;
      for (const [xi, x] of (step.scenarios || []).entries()) {
        try { checkScenario(x); } catch (e) { return `${at}, scenario ${xi + 1}: ${e.message}`; }
      }
    }
  }
  return null;
}

// The plan as a new book, opened. Returns { chapters, slices, scenarios }. Check it with checkPlan first.
export function buildPlan(plan) {
  es.createModel();
  const counts = { chapters: 0, slices: 0, scenarios: 0 };
  es.withoutSaving(() => {
    c.nameModel(plan.name.trim());
    if (plan.description) c.describeModel(String(plan.description));
    for (const ch of plan.chapters) {
      const chId = chapterId(ch.name);
      counts.chapters++;
      for (const step of ch.steps) {
        const id = addStep(step, chId);
        for (const x of step.scenarios || []) { addScenario(state().slices[id], x); counts.scenarios++; }
      }
    }
  });
  counts.slices = Object.keys(state().slices).length; // an automation that reads a new to-do list brings its view too
  return counts;
}
