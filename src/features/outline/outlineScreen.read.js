// ===========================================
// OUTLINE - Screen view (SV: Outline Screen)
// Everything the Outline shows, read once from the book and shaped for the screen:
// the book's title, chapters in order with their rows, the bottom bar's counts, the
// verify and rounds lines. The Outline draws from this and reads nothing else of the book.
// Local UI state (folds, selection, open fields) is not here: a fold comes in as a question.
// ===========================================

import { getBoardGroups, getScenariosForSlice, sliceTitle, refinedLabel, sliceRef, refinedState } from '../../core/projections.js';
import { hasValues } from '../scenarios/view.js';
import { paragraphsOf, reviewRounds, inRounds } from '../article/command.js';
import { verifyingEdition, verificationResults, verdictOf } from '../verify/command.js';
import { sliceActor } from '../board/command.js';
import { sliceComments, openComments } from '../comments/read.js';
import { usageBadge } from '../usage/view.js';
import { shows, filtering as staged, filterFor } from '../filter/status.js';
import { isLiterature } from '../literature/rules.js';
import { slicesFound } from '../search/read.js';
import { addKindChoices } from './outlineAddForm.read.js';

// Short enough to leave the slice name room on a phone; the colour bar says the rest
const shortKind = { SC: 'Change', SV: 'View', AU: 'Automation' };
// Read order of a slice: the way its story flows through the lanes
const laneFlow = { SC: [0, 1, 2], SV: [2, 1, 0], AU: [2, 0, 1] };
const laneOf = { screen: 0, processor: 0, command: 1, readModel: 1, event: 2 };
const norm = t => String(t || '').toLowerCase();

// command → event → view, in read order
function chainOf(slice, state) {
  const els = slice.elements.map(id => state.elements[id]).filter(Boolean);
  return (laneFlow[slice.type] || [0, 1, 2]).flatMap(l => els.filter(e => laneOf[e.type] === l)).map(e => e.name);
}

// A slice's fields, each name once. One that only some of its stickies carry wears their types.
function fieldsOf(slice, state) {
  const carriers = slice.elements.map(id => state.elements[id]).filter(e => e?.properties?.length);
  const byName = new Map();
  carriers.forEach(el => el.properties.forEach(p => {
    const key = p.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, { prop: p, on: [] });
    byName.get(key).on.push(el);
  }));
  // The ones every sticky shares first, then the marked ones
  return [...byName.values()].map(({ prop, on }) => ({
    prop,
    marks: carriers.length > 1 && on.length < carriers.length ? [...new Set(on.map(el => el.type))] : []
  })).sort((a, b) => !!a.marks.length - !!b.marks.length);
}

// A slice's scenarios, each with its open comments and verdict, and the stickies they name
function scenariosOf(slice, state, edition, threads) {
  const elements = {};
  const scenarios = getScenariosForSlice(slice.id, state).map(scn => {
    [...(scn.given || []).map(g => g.elementId), scn.when?.commandId, scn.then?.eventId, scn.then?.readModelId]
      .filter(Boolean).forEach(id => { if (state.elements[id]) elements[id] = state.elements[id]; });
    return {
      id: scn.id, name: scn.name, mustHave: !!scn.mustHave, scn, hasValues: hasValues(scn),
      comments: threads.filter(t => t.scenarioId === scn.id && !t.resolved),
      verdict: edition == null ? null : verdictOf(state, edition, scn.id)?.verdict || null
    };
  });
  return { scenarios, elements };
}

function rowOf(slice, state, { edition, first, last }) {
  const threads = sliceComments(state, slice.id).threads;
  const { scenarios, elements } = scenariosOf(slice, state, edition, threads);
  const actor = sliceActor(slice, state);
  return {
    sliceId: slice.id,
    ref: sliceRef(state, slice.id),
    title: sliceTitle(slice, state),
    type: slice.type,
    actor,
    kind: `${actor === 'processor' && slice.type !== 'AU' ? '⚙ ' : ''}${shortKind[slice.type] || slice.type}`,
    chain: chainOf(slice, state),
    description: slice.description || '',
    paragraphs: paragraphsOf(state, slice.id).map(p => p.text),
    refined: !!refinedState(state, slice.id)?.refined,
    usage: usageBadge(slice, state),
    waived: slice.waived || null,
    fields: fieldsOf(slice, state),
    scenarios, elements,
    comments: threads.filter(t => !t.scenarioId && !t.resolved),
    canMoveUp: !first, canMoveDown: !last,
    band: actor === 'processor' ? 'AU' : slice.type
  };
}

// The chapter's count line: how far its slices are (a plan), or what it holds (a build book)
function metaOf(inChapter, state, built) {
  if (built) {
    const scenarios = inChapter.reduce((n, s) => n + getScenariosForSlice(s.id, state).length, 0);
    return { built: true, slices: inChapter.length, scenarios };
  }
  const refined = inChapter.filter(s => s.refined).length;
  return { built: false, slices: inChapter.length, refined, label: refinedLabel(refined, inChapter.length), all: refined === inChapter.length };
}

// query: the search box. folded(id): is this chapter folded (a device setting). built: a build book.
export function outlineScreen(state, { query = '', folded = () => false, built = false } = {}) {
  if (isLiterature(state)) return { literature: true };
  const groups = getBoardGroups(state).map(g => ({ ...g, slices: g.slices.filter(s => state.sliceOrder.includes(s.id)) }));
  const all = groups.flatMap(g => g.slices);
  const firstId = all[0]?.id, lastId = all[all.length - 1]?.id;
  // The first slice can still step up out of a chapter into "no chapter"
  const canLeaveFirst = !!groups[0]?.chapter;
  const words = norm(query).split(/\s+/).filter(Boolean);
  const hits = new Set(words.length ? slicesFound(state, query).map(m => m.sliceId) : []);
  filterFor(state);
  // Searching or showing one stage: chapters open, the ones with nothing to show are left out
  const filtering = !!(words.length || staged());
  const edition = verifyingEdition(state);
  let shown = 0;
  const chapters = groups.flatMap(({ chapter, slices: inChapter }) => {
    // Searching: the slices Slices Found names (a chapter's name finds all its slices)
    const found = !words.length ? inChapter : inChapter.filter(sl => hits.has(sl.id));
    const slices = found.filter(shows);
    if (filtering && !slices.length) return [];
    shown += slices.length;
    const index = chapter ? state.chapterOrder.indexOf(chapter.id) : -1;
    return [{
      id: chapter?.id || null,
      name: chapter?.name || 'Not in a chapter',
      loose: !chapter,
      index, first: index === 0, last: index === state.chapterOrder.length - 1,
      folded: !!chapter && !filtering && !!folded(chapter.id),
      // Under the name: the whole chapter's count, or (searching) what matched
      count: inChapter.length && !words.length ? metaOf(inChapter, state, built) : { slices: slices.length },
      rows: slices.map(s => rowOf(s, state, { edition, first: s.id === firstId && !canLeaveFirst, last: s.id === lastId }))
    }];
  });
  const chapterIds = state.chapterOrder.filter(id => state.chapters[id]);
  return {
    title: state.modelName || 'Untitled model',
    // What the controls around the rows are drawn from (search box, toolbar, add buttons, + Chapter, move bar)
    search: { searching: words.length > 0 },
    toolbar: {
      total: filtering ? `${shown} of ${all.length} slices` : '',
      fields: all.length > 0, select: all.length > 0 && !filtering, openComments: openComments(state).length
    },
    bar: { title: state.modelName || 'Untitled model', sliceCount: all.length, openComments: openComments(state).length },
    addKinds: addKindChoices,
    canAddChapter: !filtering,
    searching: words.length > 0,
    filtering,
    hasChapters: state.chapterOrder.length > 0,
    chapters,
    shown,
    sliceCount: all.length,
    chapterIds,
    chapterChoices: state.chapterOrder.map(id => ({ id, name: state.chapters[id].name })),
    openComments: openComments(state).length,
    totals: { slices: all.length, chapters: chapterIds.length, scenarios: Object.keys(state.scenarios).length },
    // The slices the status chips count
    stageSlices: all,
    verify: edition == null ? null : { edition, ...verificationResults(state, edition) },
    rounds: inRounds(state) ? reviewRounds(state).text : null
  };
}
