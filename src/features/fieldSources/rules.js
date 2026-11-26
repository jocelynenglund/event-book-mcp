// ===========================================
// FIELD SOURCES - Where a field comes from (event modeling's completeness check)
// Every field has an origin, and the plan says where, while it is being planned (never a refusal):
//   - an EVENT's field is on the command of its slice (same name), or is set by the system (an id, the clock);
//   - a READ MODEL's field is on an event drawn into its slice;
//   - a COMMAND's field is on the slice's screen, when it has one (and the screen lists fields); a command an
//     automation fires takes its fields from the read model the automation uses; no screen, no automation:
//     the caller supplies them, no gap;
//   - a SCREEN's sketch (a Pad screen note; its fields are mapped, see pad/screenMappings.rules.js, so it is no source of a command's fields here): its inputs go to the command of its slice, the fields it shows are on the read model, its buttons send commands (screenGaps.js);
//   - an AUTOMATION reads a view (a read model fed by events): one with a trigger event and no read model is a gap, made right
//     by a read slice for it;
//   - a VIEW's scenario Given uses only events the view draws in (a command slice's Given is the history it
//     decides from, so it needn't draw those in).
// External events and legacy tables are sources: they are not checked. A field marked generated, or set by the
// system (FieldSetBySystem), or a read model's query parameter (FieldMarkedQuery: the caller supplies it), or mapped from another sticky's field (FieldMapped: "orderRef ← Order Placed.orderId") or from a whole event ("products[] ← each ProductConfigured"), is never a gap (a whole-event list's item fields must be on the event by name, or mapped); nor is an event's id or time, which every build makes (a guid or date
// field, or a name like orderId / sentAt). Fields match by name, ignoring case and [] / ? markers.
// It is a check for plans: a slice already built (Done), or a book that came from tests, is not hinted at; and a
// "field" written as prose ("status (open | closed)", a split-up "items[] (name") is not checked: its sticky is
// counted once, as one to tidy (tidy.js), not as several gaps.
// Worked out once per state (remembered on it), so a screen asks as often as it likes.
// ===========================================

import { fieldKey } from '../../core/constants.js';
import { getScenariosForSlice, sliceTitle } from '../../core/projections.js';
import { tidyOf, isPlainName } from './tidy.js';
import { mappingOf, itemField } from '../fieldMapping/mappings.js';
import { screenGaps } from './screenGaps.js';
import { processorTriggers } from '../board/processorReads.js';
import { isQueryField } from '../viewQueries/queryFields.js';

const seen = new WeakMap();   // state → { gaps, checked }

// An event's id or time: the system makes them, nobody plans where they come from
const stamp = (el, p) => el.type === 'event' && (p.type === 'guid' || p.type === 'date' || /^id$|Id$|At$|^timestamp$/.test(p.name));
const systemSet = (state, el, p) => !!p.generated || isQueryField(el, p.name) || !!el.setBySystem?.[fieldKey(p.name)] || !!mappingOf(state, el, p.name) || stamp(el, p);
// The fields that are names (not the pieces of one written as prose)
const fieldsOf = el => {
  const prose = new Set((tidyOf(el) || []).flatMap(g => g.ids));
  return (el.properties || []).filter(p => isPlainName(p.name) && !prose.has(p.id));
};
const carries = (el, name) => (el.properties || []).some(p => fieldKey(p.name) === fieldKey(name));
const names = els => els.map(e => e.name).join(' or ');
const doesnt = (els, verb) => `${names(els)} ${els.length > 1 ? "don't" : "doesn't"} ${verb}`;

// An event that carries a field somewhere in the book, to suggest drawing it in
function holderOf(state, field, not) {
  const have = new Set(not.map(e => e.id));
  return Object.values(state.elements).find(e => e.type === 'event' && !have.has(e.id) && !e.table && carries(e, field));
}

// A slice's elements by kind, with the pair partner's when the slice is half of an automation
function partsOf(state, slice) {
  const els = slice.elements.map(id => state.elements[id]).filter(Boolean);
  const partner = slice.pairWith && state.slices[slice.pairWith];
  const partnerEls = partner ? partner.elements.map(id => state.elements[id]).filter(Boolean) : [];
  const of = (list, type) => list.filter(e => e.type === type);
  const processors = [...of(els, 'processor'), ...of(partnerEls, 'processor')];
  // What an automation reads: the read models beside it, and the ones it is connected to
  const reads = new Map();
  [...of(els, 'readModel'), ...of(partnerEls, 'readModel')].forEach(e => reads.set(e.id, e));
  state.connections.filter(c => c.relation === 'context' && processors.some(p => p.id === c.from) && state.elements[c.to]?.type === 'readModel' && !state.elements[c.to].orphaned)
    .forEach(c => reads.set(c.to, state.elements[c.to]));
  return {
    els, events: of(els, 'event'), commands: of(els, 'command'), readModels: of(els, 'readModel'), screens: of(els, 'screen'),
    automated: processors.length > 0, reads: [...reads.values()]
  };
}

function check(state, slice, out) {
  const title = sliceTitle(slice, state);
  const { els, events, commands, readModels, screens, automated, reads } = partsOf(state, slice);
  const mark = (el, kind) => { (out.checked[slice.id] ||= {})[el.id] = kind; };
  // from: the stickies the field could be added to (where the rule knows its source); holder: an event elsewhere that carries it
  const gap = (el, field, why, fix, kind, { from = [], holder = null, fixes = null } = {}) => {
    const g = { sliceId: slice.id, slice: title, elementId: el.id, sticky: el.name, field, why, fix, kind,
      from: from.map(e => ({ id: e.id, name: e.name })), holder: holder ? { id: holder.id, name: holder.name } : null, ...(fixes ? { fixes } : {}) };
    out.gaps.push(g);
    out.at.set(`${slice.id}|${el.id}|${field}`, g);
  };

  // An event a command of the slice produces: its fields come from that command
  if (commands.length) {
    events.filter(e => !e.external && !e.table).forEach(el => {
      mark(el, 'event');
      fieldsOf(el).filter(p => !systemSet(state, el, p) && !commands.some(c => carries(c, p.name))).forEach(p =>
        gap(el, p.name, doesnt(commands, `carry ${p.name}`), `add ${p.name} to ${names(commands)}, or mark it set by the system`, 'event', { from: commands }));
    });
  }

  // A read model: its fields come from the events drawn into its slice
  // (a slice with a command is a change: its read model, if any, is what an automation reads)
  if (!commands.length) readModels.forEach(el => {
    mark(el, 'readModel');
    fieldsOf(el).filter(p => !systemSet(state, el, p) && !events.some(e => carries(e, p.name))).forEach(p => {
      const holder = holderOf(state, p.name, events);
      gap(el, p.name, `no event drawn into this view carries ${p.name}`,
        holder ? `draw in an event that carries ${p.name} (e.g. ${holder.name}), or mark it set by the system` : `add ${p.name} to an event drawn into this view, or mark it set by the system`, 'readModel', { holder });
    });
  });

  // A command: its fields come from the screen that sends it, or from the read model its automation uses
  const source = automated ? { from: reads, why: f => `${names(reads)} ${reads.length > 1 ? "have" : "has"} no ${f}`, fix: f => `add ${f} to ${names(reads)}, or mark it set by the system` }
    : screens.some(s => !s.sketch && s.properties?.length) ? { from: screens.filter(s => !s.sketch && s.properties?.length), why: f => `the ${names(screens)} screen has no ${f}`, fix: f => `add ${f} to the ${names(screens)} screen` } : null;
  if (source?.from.length) commands.forEach(el => {
    mark(el, 'command');
    fieldsOf(el).filter(p => !systemSet(state, el, p) && !source.from.some(s => carries(s, p.name))).forEach(p =>
      gap(el, p.name, source.why(p.name), source.fix(p.name), 'command', { from: source.from }));
  });

  // A screen made from a Pad sketch: its inputs go to the command, its read models carry the fields it shows, its buttons send commands
  screenGaps(state, slice, screens, commands, gap);
  // An automation reads a view: an input is always a read model, fed by events. One made the older way (an event
  // that wakes the processor, no read model) says so, once, on the first slice it sits in
  els.filter(el => el.type === 'processor' && !out.automations.has(el.id)).forEach(proc => {
    const triggers = processorTriggers(state, proc.id);
    if (!triggers.length || reads.length) return;
    out.automations.add(proc.id);
    gap(proc, '(the event)', 'an automation reads a view', `draw ${triggers.map(t => t.name).join(', ')} into a read slice`, 'automation');
  });

  // A view's scenario Given: the events it starts from are the ones the view draws in
  if (slice.type === 'SV') {
    const drawn = new Set(slice.elements);
    const used = new Set();
    getScenariosForSlice(slice.id, state).forEach(scn => (scn.given || []).forEach(g => {
      const el = state.elements[g.elementId];
      if (!el || drawn.has(el.id) || used.has(el.id)) return;
      used.add(el.id);
      gap(el, '(the event)', `a scenario's Given uses ${el.name}, which this slice doesn't draw in`, `draw ${el.name} into the slice`, 'given', { holder: el });
    }));
  }

  // A list that comes from a whole event ("products[] ← each ProductConfigured"): its item fields come from that event's fields,
  // by name or mapped ("products[].sku ← Sku Chosen.skuRef"); one that does neither is a gap on the list
  els.filter(el => out.checked[slice.id]?.[el.id]).forEach(el => fieldsOf(el).filter(p => p.items?.length).forEach(p => {
    const m = mappingOf(state, el, p.name);
    const events = (m?.sources || []).filter(s => s.whole).map(s => state.elements[s.elementId]);
    if (!events.length) return;
    const lost = p.items.filter(i => !mappingOf(state, el, itemField(p, i)) && !events.some(event => carries(event, i)));
    const names = events.map(e => e.name).join(' or ');
    if (lost.length) gap(el, p.name, `${lost.join(', ')} ${lost.length > 1 ? 'are' : 'is'} not on ${names}`, `map ${lost.join(', ')} from a field, or add ${lost.length > 1 ? 'them' : 'it'} to ${events[0].name}`, out.checked[slice.id][el.id]);
  }));

  // Fields written as prose: one sticky to tidy, whatever it is and however many pieces
  els.forEach(el => {
    const groups = tidyOf(el);
    if (!groups) return;
    const fields = groups.flatMap(g => g.names);
    out.tidy.push({ sliceId: slice.id, slice: title, elementId: el.id, sticky: el.name, fields, kind: 'tidy' });
    fields.forEach(field => out.at.set(`${slice.id}|${el.id}|${field}`, { sliceId: slice.id, slice: title, elementId: el.id, sticky: el.name, field, kind: 'tidy',
      why: `${field} is a piece of a field written as prose`, fix: `tidy the fields of ${el.name}` }));
    (out.checked[slice.id] ||= {})[el.id] ||= 'tidy';
  });
}

// { gaps: [{ sliceId, slice, elementId, sticky, field, why, fix, kind, from, holder }] in the slices' order,
//   tidy: [{ sliceId, slice, elementId, sticky, fields }]: the stickies with fields written as prose (one each, per slice),
//   checked: sliceId → elementId → the rule that applies to that sticky there,
//   at: 'sliceId|elementId|field' → its gap (a piece of prose too, with kind 'tidy') }
export function fieldSources(state) {
  if (seen.has(state)) return seen.get(state);
  const out = { gaps: [], tidy: [], checked: {}, at: new Map(), automations: new Set() };
  if (state.kind !== 'literature' && !state.modelSource) state.sliceOrder.map(id => state.slices[id]).filter(s => s && !s.built).forEach(slice => check(state, slice, out));
  seen.set(state, out);
  return out;
}

// How many fields have no source in these slices (a chapter, a slice)
export const gapCount = (state, sliceIds) => {
  const ids = new Set(sliceIds);
  return fieldSources(state).gaps.filter(g => ids.has(g.sliceId)).length;
};

// How many stickies in these slices have fields written as prose (each once, in however many slices it sits)
export const tidyCount = (state, sliceIds) => {
  const ids = new Set(sliceIds);
  return new Set(fieldSources(state).tidy.filter(t => ids.has(t.sliceId)).map(t => t.elementId)).size;
};

export { noSourceText, tidyText, completenessText } from './text.js';
