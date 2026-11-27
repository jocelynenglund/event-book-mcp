// ===========================================
// OUTLINE DESKTOP - Scenario Columns (SV: S3 Scenario as columns)
// One scenario as three columns, Given | When | Then: each sticky in it with the values it was given (every field of the sticky,
// the ones with no value yet empty and ready to fill), a rejection with its reason, "nothing happens" with its reason, a
// view's query. Also its name, whether it is a must have, and how many open comments it holds.
// editable: this device can change the book here.
// ===========================================

import { sliceComments } from '../comments/read.js';

const textOf = v => typeof v === 'string' ? v : JSON.stringify(v);
const isSet = v => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && !v.length);

// A sticky and the values it carries: each field it has, set or not (the ones set first, in the order given)
function stickyOf(state, elementId, values = {}) {
  const el = state.elements[elementId];
  if (!el) return null;
  const given = Object.entries(values || {}).filter(([, v]) => isSet(v)).map(([key, v]) => ({ key, text: textOf(v), set: true }));
  const rest = (el.properties || []).filter(p => !given.some(g => g.key === p.name)).map(p => ({ key: p.name, text: '', set: false }));
  return { elementId, name: el.name, values: [...given, ...rest] };
}

export function scenarioColumns(state, scenarioId, { editable = true } = {}) {
  const scn = state.scenarios[scenarioId];
  if (!scn) return null;
  const sticky = (id, values) => stickyOf(state, id, values) || { elementId: id, name: 'a sticky that was removed', values: [] };

  const given = (scn.given || []).map((g, index) => ({ index, ...sticky(g.elementId, g.values) }));
  let when = { kind: 'none' };
  if (scn.when?.commandId) when = { kind: 'command', ...sticky(scn.when.commandId, scn.when.values) };
  else if (scn.when?.query) when = { kind: 'query', text: scn.when.query };

  const t = scn.then;
  let then = { kind: 'unset' };
  if (t?.type === 'event') then = { kind: 'event', ...sticky(t.eventId, t.values) };
  else if (t?.type === 'readModel') then = { kind: 'readModel', ...sticky(t.readModelId, t.values), rows: t.rows?.length || 0 };
  else if (t?.type === 'rejection') then = { kind: 'rejected', reason: t.reason || '' };
  else if (t?.type === 'nothing') then = { kind: 'nothing', reason: t.reason || '' };

  return {
    scenarioId, sliceId: scn.sliceId, name: scn.name, mustHave: !!scn.mustHave, editable: !!editable,
    comments: sliceComments(state, scn.sliceId).threads.filter(c => c.scenarioId === scenarioId && !c.resolved).length,
    given, when, then
  };
}
