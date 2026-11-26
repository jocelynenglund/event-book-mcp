// ===========================================
// CLONE SLICE - Commands (Clone Slice, Give Scenario Its Own Ending)
// A clone is an alternate ending of a slice, a slice of its own: it REUSES the stickies it keeps (the same elements, so the board shows
// 🔗 N on them and they stay one command), and is placed right after the original, in its chapter. One action: one undo.
// A refusal comes back as its words (a string); a clone comes back as { sliceId, endingId, scenarios }.
// ===========================================

import { appendEvent, EventTypes } from '../../core/eventStore.js';
import { projectState, getScenariosForSlice } from '../../core/projections.js';
import { createSlice, addToSlice, placeSlices, newId } from '../board/command.js';
import { findByName } from '../outline/command.js';
import { addProperty } from '../properties/command.js';
import { addScenario, setMustHave, setGiven, setWhen, setQuery, setThenEvent, setThenRejection, setThenNothing, setThenReadModel, moveScenario } from '../scenarios/command.js';
import { CloneSliceEvents } from './cloneSlice.events.js';
import { cloneable, nameFor, defaultKeep } from './cloneSlice.rules.js';

const ofType = (slice, state, type) => slice.elements.filter(id => state.elements[id]?.type === type);

// The ending: a new event (or the book's own of that name), carrying the command's fields like a new event in a Do step does
function addEnding(sliceId, from, name, state) {
  const known = findByName('event', name, state);
  if (known) return addToSlice(sliceId, 'event', { elementId: known.id });
  const endingId = addToSlice(sliceId, 'event', { name: name.trim() });
  const command = ofType(from, state, 'command').map(id => state.elements[id])[0];
  (command?.properties || []).forEach(p => addProperty(endingId, p.name, p.type, p.items?.length ? p.items : null));
  return endingId;
}

// A scenario as it stands, onto another slice (its Given, When and Then as they are)
function copyScenario(scn, sliceId) {
  const id = addScenario(sliceId, scn.name, scn.type);
  if (scn.mustHave) setMustHave(id, true);
  if (scn.given?.length) setGiven(id, scn.given.map(g => ({ elementId: g.elementId, values: g.values })));
  if (scn.when?.commandId) setWhen(id, scn.when.commandId, scn.when.values || {});
  if (scn.when?.query) setQuery(id, scn.when.query);
  const then = scn.then;
  if (then?.type === 'event') setThenEvent(id, then.eventId, then.values || {});
  else if (then?.type === 'rejection') setThenRejection(id, then.reason);
  else if (then?.type === 'nothing') setThenNothing(id, then.reason);
  else if (then?.type === 'readModel') setThenReadModel(id, then.readModelId, then.values || {}, then.rows || null);
  return id;
}

// keep: which stickies the clone reuses (screen, command; a view: readModel, screen; events; scenarios, copied)
// ending: the name of a new event for the clone (a change only)
export function cloneSlice({ sliceId, name = '', keep = {}, ending = '' } = {}) {
  const state = projectState();
  const slice = state.slices[sliceId];
  if (!slice) return 'That slice is gone';
  if (!cloneable(slice, sliceId)) return 'An automation\'s slices are not cloned';
  const endingName = String(ending ?? '').trim();
  if (endingName && slice.type === 'SV') return 'A view has no ending';
  const kept = { ...defaultKeep, ...keep };

  const cloneId = createSlice(slice.type, String(name ?? '').trim() || nameFor(slice, state), { actor: slice.actor, chapterId: slice.chapterId });
  appendEvent(CloneSliceEvents.SliceCloned, { sliceId: cloneId, from: sliceId });
  placeSlices([cloneId], { after: sliceId });

  const lanes = slice.type === 'SV' ? ['readModel', 'screen'] : ['screen', 'command'];
  lanes.filter(type => kept[type]).forEach(type => ofType(slice, state, type).forEach(elementId => addToSlice(cloneId, type, { elementId })));
  if (kept.events) ofType(slice, state, 'event').forEach(elementId => addToSlice(cloneId, 'event', { elementId }));
  const endingId = endingName ? addEnding(cloneId, slice, endingName, projectState()) : null;

  const scenarios = {};
  if (kept.scenarios) getScenariosForSlice(sliceId, state).forEach(scn => { scenarios[scn.id] = copyScenario(scn, cloneId); });
  return { sliceId: cloneId, endingId, scenarios };
}

// A scenario that fails gets a slice of its own to end in: its slice is cloned (screen and command reused, no events) and the scenario
// MOVES into it; with an ending, its Then is that new event
export function giveScenarioItsOwnEnding({ scenarioId, name = '', ending = '' } = {}) {
  const state = projectState();
  const scn = state.scenarios[scenarioId];
  const slice = scn && state.slices[scn.sliceId];
  if (!slice) return 'That scenario is gone';
  if (slice.type === 'SV') return 'A view has no ending';
  const made = cloneSlice({ sliceId: slice.id, name, keep: { screen: true, command: true, events: false, scenarios: false }, ending });
  if (typeof made === 'string') return made;
  moveScenario(scenarioId, made.sliceId);
  if (made.endingId) setThenEvent(scenarioId, made.endingId, {});
  return { sliceId: made.sliceId, endingId: made.endingId, scenarioId };
}
