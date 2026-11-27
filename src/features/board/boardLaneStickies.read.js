// ===========================================
// BOARD - Lane (SV: Board Lane Stickies)
// One lane of one slice's column: its stickies (each with its kind, fields and tags), or, for a
// view, one pile of the events it reads, and the ＋ for another. The lane's stickies are the items
// of this list, so the Board card draws from the same view (a list and its item are one unit).
// ===========================================

import { elementFlow, getTodoUpdates } from '../../core/projections.js';
import { elementLabel, externalAttr } from '../../core/constants.js';
import { fieldLabel } from '../viewQueries/queryFields.js';
import { laneOf, laneTypeFor, sliceActor, sliceProcessor } from './command.js';
import { processorReads, readSliceHasEvent, isLabelledTrigger } from './processorReads.js';
import { fieldsFolded, foldedLabel } from './foldedFields.js';
import { stickyFieldGaps } from '../fieldSources/stickyFieldGaps.read.js';
import { stickyFieldMappings, mappedFrom } from '../fieldMapping/stickyFieldMappings.read.js';
import { screenInSlice } from '../pad/screenInSlice.read.js';
import { screenPageChipsExtra } from '../pages/screenPageChips.read.js'; // feature: pages

// What other features add to a sticky: (state, element) → { kind, view } or null (the Board card draws each, by its kind: board.parts.js)
const cardExtraViews = [
  screenPageChipsExtra, // feature: pages
];
import { slicesHolding } from './sheets/stickyPlaces.read.js';

const typeNames = { command: 'Command', event: 'Event', readModel: 'Read model', processor: 'Automation', screen: 'Screen' };

// Arrow between lane n-1 and lane n, per slice type
// SC flows down (screen → command → event), SV flows up (event → view → screen),
// AU: processor ↓ command (the trigger event feeds the processor, past the command)
const arrows = { SC: [null, 'down', 'down'], SV: [null, 'up', 'up'], AU: [null, 'down', null] };

// Small tags under a card, shared by the board and the poster:
// - a to-do list: the events that add (+) or tick off (✓) its items
// - a processor: the view slice it reads ("reads Reminders Due", a tap goes there; the read model's own name when no
//   view slice holds it), and, the older way, the events that trigger it when no read slice shows them
export function cardTags(el, slice, state) {
  if (el.type === 'readModel' && el.todo) {
    // Start to finish: what adds an item first, then what ticks it off
    return getTodoUpdates(el.id, state)
      .sort((a, b) => (a.role === 'completes') - (b.role === 'completes'))
      .map(({ event, role }) => ({
        text: `${role === 'completes' ? '✓' : '+'} ${event.name}`, kind: role, flip: event.id, external: !!event.external
      }));
  }
  if (el.type === 'processor') {
    // An automation pair's halves sit side by side, so the partner counts as "here"
    const partner = slice?.pairWith && state.slices[slice.pairWith];
    const here = new Set([...(slice?.elements || []), ...(partner?.elements || [])]);
    // It reads a view slice: said by the slice's title (a tap goes there), and not by the slice it is itself. A read
    // model no view slice holds is named as it is, unless it is right here.
    const reads = processorReads(state, el.id)
      .filter(r => (r.sliceId ? r.sliceId !== slice?.id : !here.has(r.readModelId)))
      .map(r => ({ text: `${r.todo ? '☑ ' : ''}reads ${r.title || r.name}`, kind: 'reads', goto: r.sliceId }))
      .filter((t, i, all) => all.findIndex(x => x.text === t.text) === i);
    // The older way: an event that wakes it with no read slice showing that event
    const triggers = state.connections
      .filter(c => c.to === el.id && c.relation === 'trigger' && !here.has(c.from) && state.elements[c.from] && !state.elements[c.from].orphaned && !readSliceHasEvent(state, el.id, c.from))
      .map(c => ({ text: `⚡ on ${state.elements[c.from].name}`, kind: 'trigger', goto: null, external: !!state.elements[c.from].external }));
    return [...reads, ...triggers];
  }
  return [];
}

// The Sticky Field Gaps entry of a field, with the sticky and slice it is on; null when it has a source
function gapOf(gaps, el, slice, p) {
  const f = gaps.find(g => g.elementId === el.id)?.fields.find(x => x.name === p.name && x.gap);
  return f ? { elementId: el.id, sliceId: slice.id, name: f.name, why: f.why, fix: f.fix, ...(f.tidy ? { tidy: true } : {}) } : null;
}

// An outcome event of another flow than the one shown (on the main line: any flow)
export function otherFlow(el, slice, state, shownFlowId) {
  const f = elementFlow(el, slice, state);
  return !!f && f.id !== (shownFlowId || 'main');
}

// One sticky. trigger: this event wakes the slice's processor up. first: where a to-do list is
// shown in full (later columns that read the same list get a slim reference).
function cardOf(el, slice, state, { trigger, first, shownFlowId, gaps, mappings, trace }) {
  const todo = el.type === 'readModel' && !!el.todo;
  const base = { elementId: el.id, sliceId: slice.id, type: el.type, name: el.name, todo, tiltKey: slice.id + el.id };
  if (todo && !first) return { ...base, ref: true };
  const tags = cardTags(el, slice, state);
  const outcome = el.type === 'event' ? elementFlow(el, slice, state) : null;
  const props = el.properties || [];
  const wire = screenInSlice(state, slice.id, el.id);   // a screen made from a Pad sketch draws it, seen from this slice
  const extras = cardExtraViews.map(extra => extra(state, el)).filter(Boolean);
  return {
    ...base, ref: false, ...(wire ? { screen: wire } : {}), ...(extras.length ? { extras } : {}),
    label: elementLabel(el),
    attrs: externalAttr(el),
    to: el.type === 'event' && el.published && !el.external ? (el.to || []).join(', ') : '',
    trigger: !!trigger,
    list: el.type === 'readModel' && !!el.list && !todo,
    otherFlow: !!outcome && otherFlow(el, slice, state, shownFlowId),
    outcome: outcome ? outcome.name : null,
    // In more than one live slice (reused): how many, for the 🔗 N mark; 0 when it is only here
    places: slicesHolding(state, el.id).length > 1 ? slicesHolding(state, el.id).length : 0,
    foldedProps: props.length && fieldsFolded(el.id) ? foldedLabel(props.length) : null,
    // A field with no source wears a ⚠ (Sticky Field Gaps): its why and fix, and where it sits
    // ...and one that comes from another sticky's field says which (Sticky Field Mappings)
    props: props.map(p => ({ id: p.id, name: p.name, label: fieldLabel(el, p), generated: !!p.generated, gap: gapOf(gaps, el, slice, p), from: mappedFrom(mappings, el.id, p.name) })),
    // While a field is traced: the step numbers this sticky is on (Field Trace), or false when it is off the path
    trace: trace ? trace.marks[el.id] || false : null,
    tags
  };
}

// A view only reads its events, so a view's events lane shows each as the shared sticky (with its 🔗 N and the ↑ to the read
// model), whether or not a scenario starts from it. Only a long list (over this many) folds into one pile, opened in a drawer.
const MOST_STICKIES = 4;
const piled = (slice, lane, laneEls, state) => lane === 2 && laneEls.length > MOST_STICKIES && slice.type === 'SV' && sliceActor(slice, state) !== 'processor';

// col: the column from the layout ({ slice, … }); lane: 0, 1 or 2; layout: what the layout hands every part
// (the first slice of each to-do list, the flow shown in a chapter)
export function boardLaneStickies(state, col, lane, layout) {
  const slice = col.slice;
  const els = slice.elements.map(id => state.elements[id]).filter(Boolean);
  const byLane = [0, 1, 2].map(l => els.filter(e => laneOf[e.type] === l));
  let laneEls = byLane[lane];
  const sliceArrows = arrows[slice.type] || [];
  const flow = sliceArrows[lane] && byLane[lane].length && byLane[lane - 1].length ? sliceArrows[lane] : null;
  const base = { lane, flow };
  if (piled(slice, lane, laneEls, state)) {
    return { ...base, sliceId: slice.id, cards: [], add: null, tiltKey: slice.id + 'pile',
      pile: { names: laneEls.map(e => e.name), count: laneEls.length, note: ' it reads' } };
  }
  const type = laneTypeFor(slice, lane, state);
  const processor = sliceProcessor(slice, state);
  const shownFlowId = layout.shownFlowId(slice.chapterId);
  const gaps = stickyFieldGaps(state, slice.id), mappings = stickyFieldMappings(state, slice.id);
  const cards = laneEls.map(el => cardOf(el, slice, state,
    { trigger: el.type === 'event' && processor && isLabelledTrigger(el.id, processor.id, state), first: layout.todoFirst[el.id] === slice.id, shownFlowId, gaps, mappings, trace: layout.trace }));
  // Events can stack (a command may emit several, a view may read several), and a
  // processor can read several read models
  const readsMany = lane === 1 && slice.type === 'SV' && sliceActor(slice, state) === 'processor';
  const canAdd = type && !slice.id.startsWith('au_inferred_') && (laneEls.length === 0 || lane === 2 || readsMany);
  // A view's events also open as a list (where each came from, ↗ there, ✎, ✕): the lane's "all events" link
  const list = lane === 2 && slice.type === 'SV' && sliceActor(slice, state) !== 'processor' && cards.length > 0;
  return { ...base, sliceId: slice.id, cards, pile: null, list,
    add: canAdd ? { type, label: typeNames[type] || type, more: laneEls.length > 0 } : null };
}
