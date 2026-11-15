// ===========================================
// BOARD - Screen view (SV: Board Screen)
// Everything the Board shows, read once from the book and shaped for the screen: the header's
// counts, chapters in order (folded ones as a spine), each slice's column with its lanes and
// cards, its scenarios and its open comments. The Board draws from this and reads nothing else
// of the book. Local UI state is not here: folds and the flow shown come in as questions.
// ===========================================

import { getBoardGroups, getScenariosForSlice, boardBuildChip, sliceTitle, sliceRef, sliceFlow, chapterFlows, elementFlow,
  givenEventsOf, eventsWithoutScenario, getTodoUpdates } from '../../core/projections.js';
import { elementLabel, externalAttr, propLabel } from '../../core/constants.js';
import { laneOf, laneTypeFor, sliceActor, sliceProcessor, isTrigger } from './command.js';
import { shows, filtering as staged, emptyText, filterFor } from '../filter/status.js';
import { fieldsFolded, foldedLabel } from './foldedFields.js';
import { usageBadge, chapterMeter } from '../usage/view.js';
import { sliceComments, openComments, boardChat } from '../comments/read.js';

export const sliceTypeLabels = { SC: 'State change', SV: 'State view', AU: 'Automation' };
const typeNames = { command: 'Command', event: 'Event', readModel: 'Read model', processor: 'Automation', screen: 'Screen' };

// Arrow between lane n-1 and lane n, per slice type
// SC flows down (screen → command → event), SV flows up (event → view → screen),
// AU: processor ↓ command (the trigger event feeds the processor, past the command)
const arrows = { SC: [null, 'down', 'down'], SV: [null, 'up', 'up'], AU: [null, 'down', null] };

// Small tags under a card, shared by the board and the poster:
// - a to-do list: the events that add (+) or tick off (✓) its items
// - a processor: the read models it reads and the events that trigger it, when
//   they aren't in this column, so a one-slice automation still says what drives it
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
    // ...and the processor's inputs are said once, on the view half (the left one)
    if (slice?.type === 'SC' && partner?.type === 'SV' && partner.elements.includes(el.id)) return [];
    const here = new Set([...(slice?.elements || []), ...(partner?.elements || [])]);
    const reads = state.connections
      .filter(c => c.from === el.id && c.relation === 'context' && !here.has(c.to) && state.elements[c.to])
      .map(c => ({ text: `${state.elements[c.to].todo ? '☑ ' : ''}reads ${state.elements[c.to].name}`, kind: 'reads' }));
    const triggers = state.connections
      .filter(c => c.to === el.id && c.relation === 'trigger' && !here.has(c.from) && state.elements[c.from])
      .map(c => ({ text: `⚡ on ${state.elements[c.from].name}`, kind: 'trigger', external: !!state.elements[c.from].external }));
    return [...reads, ...triggers];
  }
  return [];
}

// Each to-do list's first slice, left to right (shared with the poster)
export function firstAppearances(groups, state) {
  const first = {};
  groups.flatMap(g => g.slices).forEach(s => s.elements.forEach(id => {
    if (state.elements[id]?.todo && !first[id]) first[id] = s.id;
  }));
  return first;
}

// A chapter with flows shows its main line (the happy case) or one flow: the
// main line plus that flow's slices, in order. Always read left to right.
// flowOf(chapterId, state): the flow shown there, or null.
export function withFlows(groups, state, flowOf) {
  return groups.map(g => {
    if (!g.chapter || !chapterFlows(g.chapter.id, state).length) return g;
    const flow = flowOf(g.chapter.id, state);
    return { ...g, flow, slices: g.slices.filter(s => { const f = sliceFlow(s, state); return !f || f.id === flow?.id; }) };
  });
}

// An outcome event of another flow than the one shown (on the main line: any flow)
export function otherFlow(el, slice, state, shownFlowId) {
  const f = elementFlow(el, slice, state);
  return !!f && f.id !== (shownFlowId || 'main');
}

// One sticky. trigger: this event wakes the slice's processor up. first: where a to-do list is
// shown in full (later columns that read the same list get a slim reference).
function cardOf(el, slice, state, { trigger, first, shownFlowId }) {
  const todo = el.type === 'readModel' && !!el.todo;
  const base = { elementId: el.id, sliceId: slice.id, type: el.type, name: el.name, todo, tiltKey: slice.id + el.id };
  if (todo && !first) return { ...base, ref: true };
  const tags = cardTags(el, slice, state);
  const outcome = el.type === 'event' ? elementFlow(el, slice, state) : null;
  const props = el.properties || [];
  return {
    ...base, ref: false,
    label: elementLabel(el),
    attrs: externalAttr(el),
    trigger: !!trigger,
    list: el.type === 'readModel' && !!el.list && !todo,
    otherFlow: !!outcome && otherFlow(el, slice, state, shownFlowId),
    outcome: outcome ? outcome.name : null,
    foldedProps: props.length && fieldsFolded(el.id) ? foldedLabel(props.length) : null,
    props: props.map(p => ({ id: p.id, label: propLabel(p), generated: !!p.generated })),
    tags
  };
}

// A view only reads its events: on the board they're one pile, not stickies to edit
const piled = (slice, lane, laneEls, state) => lane === 2 && laneEls.length > 0 && slice.type === 'SV' && sliceActor(slice, state) !== 'processor';

function laneOfSlice(slice, lane, laneEls, flow, state, opts) {
  const base = { lane, flow };
  if (piled(slice, lane, laneEls, state)) {
    const open = new Set(eventsWithoutScenario(slice.id, state).map(e => e.id));
    const uncovered = laneEls.filter(e => open.has(e.id));
    if (uncovered.length) {
      // The events no scenario starts from yet; the covered ones are in the given stack under the scenarios
      const hasScenarios = getScenariosForSlice(slice.id, state).length > 0;
      return { ...base, sliceId: slice.id, cards: [], add: null, tiltKey: slice.id + 'pile',
        pile: { names: uncovered.map(e => e.name), count: uncovered.length, note: slice.type === 'SV' ? (hasScenarios ? ' with no scenario yet' : ' it reads') : '' } };
    }
    laneEls = [];   // every event is covered: they're in the given stack under the scenarios
  }
  const type = laneTypeFor(slice, lane, state);
  const processor = sliceProcessor(slice, state);
  const cards = laneEls.map(el => cardOf(el, slice, state,
    { trigger: el.type === 'event' && processor && isTrigger(el.id, processor.id, state), first: opts.todoFirst[el.id] === slice.id, shownFlowId: opts.shownFlowId(slice) }));
  // Events can stack (a command may emit several, a view may read several), and a
  // processor can read several read models
  const readsMany = lane === 1 && slice.type === 'SV' && sliceActor(slice, state) === 'processor';
  const canAdd = type && !slice.id.startsWith('au_inferred_') && (laneEls.length === 0 || lane === 2 || readsMany);
  return { ...base, sliceId: slice.id, cards, pile: null,
    add: canAdd ? { type, label: typeNames[type] || type, more: laneEls.length > 0 } : null };
}

// The scenarios cell under the lanes: counts and the events they start from (closed), or each one
function gwtOf(slice, state) {
  const scenarios = getScenariosForSlice(slice.id, state);
  const elements = {};
  scenarios.forEach(scn => {
    [...(scn.given || []).map(g => g.elementId), scn.when?.commandId, scn.then?.eventId, scn.then?.readModelId]
      .filter(Boolean).forEach(id => { if (state.elements[id]) elements[id] = state.elements[id]; });
  });
  return {
    sliceId: slice.id, count: scenarios.length, inferred: slice.id.startsWith('au_inferred_'),
    givens: givenEventsOf(slice.id, state).map(g => g.element.name),
    scenarios: scenarios.map(scn => ({ id: scn.id, name: scn.name || 'Scenario', mustHave: !!scn.mustHave, scn })),
    elements
  };
}

function columnOf(slice, state, { prev, next }, opts) {
  const els = slice.elements.map(id => state.elements[id]).filter(Boolean);
  const byLane = [0, 1, 2].map(l => els.filter(e => laneOf[e.type] === l));
  const sliceArrows = arrows[slice.type] || [];
  const flow = sliceFlow(slice, state);
  const ref = sliceRef(state, slice.id);
  const title = sliceTitle(slice, state);
  return {
    sliceId: slice.id, ref, title, type: slice.type, typeLabel: sliceTypeLabels[slice.type] || slice.type,
    actor: sliceActor(slice, state),
    scenarios: getScenariosForSlice(slice.id, state).length,
    flow: flow ? flow.name : null,
    usage: usageBadge(slice, state),
    chip: boardBuildChip(state, slice.id),
    waived: slice.waived || null,
    movable: state.sliceOrder.includes(slice.id), prev: prev || null, next: next || null,
    lanes: [0, 1, 2].map(l => laneOfSlice(slice, l, byLane[l],
      sliceArrows[l] && byLane[l].length && byLane[l - 1].length ? sliceArrows[l] : null, state, opts)),
    gwt: gwtOf(slice, state),
    comments: opts.hasComments ? sliceComments(state, slice.id).threads.filter(t => !t.resolved) : []
  };
}

// folded(id): is this chapter folded (a device setting). flowOf(id, state): the flow shown in a chapter, or null.
export function boardScreen(state, { folded = () => false, flowOf = () => null } = {}) {
  filterFor(state);
  const allGroups = withFlows(getBoardGroups(state), state, flowOf);
  // Moving still steps past the slices a stage hides, so neighbours come from the whole chapter
  const neighbours = new Map(allGroups.map(g => [g.chapter?.id ?? '', g.slices.filter(s => state.sliceOrder.includes(s.id))]));
  // Showing one stage: just its slices (chapters opened, the ones with none left out)
  const filtering = !!staged();
  const groups = filtering ? allGroups.map(g => ({ ...g, slices: g.slices.filter(shows) })).filter(g => g.slices.length) : allGroups;
  const sliceCount = groups.reduce((n, g) => n + g.slices.length, 0);
  const hasComments = Object.values(state.comments || {}).some(c => !c.deleted);
  const opts = {
    hasComments, todoFirst: firstAppearances(groups, state),
    shownFlowId: slice => flowOf(slice.chapterId, state)?.id
  };
  const chapterIds = state.chapterOrder.filter(id => state.chapters[id]);
  const of = type => Object.values(state.elements).filter(e => e.type === type).length;
  const chat = boardChat(state).open;

  const chapters = groups.map(({ chapter, slices }) => {
    const base = { id: chapter?.id || null, name: chapter?.name || '', loose: !chapter, slices: slices.length };
    if (chapter && !filtering && folded(chapter.id)) {
      return { ...base, folded: true, columns: [], empty: false,
        spine: { bands: slices.map(s => sliceActor(s, state) === 'processor' ? 'AU' : s.type), meter: chapterMeter(chapter, state) } };
    }
    const movable = neighbours.get(chapter?.id ?? '') || [];
    const shown = chapter ? flowOf(chapter.id, state) : null;
    return { ...base, folded: false, spine: null, empty: !!chapter && !slices.length,
      flows: chapter ? chapterFlows(chapter.id, state).map(f => ({ id: f.id, name: f.name })) : [],
      shownFlow: shown ? shown.id : null,
      columns: slices.map(s => {
        const i = movable.indexOf(s);
        return columnOf(s, state, { prev: movable[i - 1]?.id, next: movable[i + 1]?.id }, opts);
      }) };
  });

  return {
    title: state.modelName || 'Untitled model',
    filtering, sliceCount, hasChapters: state.chapterOrder.length > 0, chapters,
    // Nothing to show: a stage with nothing in it says so; a book with no chapter yet points at the +
    emptyHint: sliceCount === 0 && filtering ? emptyText() : null,
    firstRun: sliceCount === 0 && !filtering && !state.chapterOrder.length,
    hasComments, openComments: hasComments ? openComments(state).length : 0,
    stageSlices: getBoardGroups(state).flatMap(g => g.slices),
    stats: {
      empty: !Object.keys(state.slices).length,
      slices: Object.keys(state.slices).length,
      chapters: state.chapterOrder.length,
      events: of('event'), commands: of('command'), readModels: of('readModel'), automations: of('processor'), screens: of('screen'),
      scenarios: Object.keys(state.scenarios).length,
      chat, chapterIds, anyOpen: chapterIds.some(id => !folded(id)),
      source: state.modelSource?.commit ? { commit: state.modelSource.commit, build: state.modelSource.build || null } : null
    }
  };
}
