// ===========================================
// AUTOMATE - Commands
// SC: Run Slice From Automation — an existing command slice becomes the second half of an
// automation: its processor runs it when an event happens. Its first half is a view slice
// holding the processor and the event it waits for: a new one just before it, or an existing
// view slice with no other half. It keeps its command, event, fields and scenarios; a screen
// on it leaves (the processor drives it now).
// SC: Run Slice By Person — and back: a person's step again, unpaired; the view slice stays.
// Each returns why not, or null.
// ===========================================

import { appendEvent, EventTypes } from '../../core/eventStore.js';
import { projectState, sliceTitle } from '../../core/projections.js';
import { createSlice, addToSlice, removeFromSlice, placeSlices, setTrigger, newId } from '../board/command.js';
import { findByName } from '../outline/command.js';

const runBy = (slice, state) => {
  const halves = [slice, state.slices[slice.pairWith]].filter(Boolean);
  const id = halves.flatMap(s => s.elements).find(e => state.elements[e]?.type === 'processor');
  return id ? state.elements[id].name : null;
};
const automated = slice => slice.actor === 'processor' || !!slice.pairWith;

// An element by name: the book's own, or a new one
function elementNamed(type, name, state) {
  const hit = findByName(type, name, state);
  if (hit) return hit.id;
  const id = newId('el');
  appendEvent(EventTypes.ElementCreated, { elementId: id, elementType: type, name: name.trim() });
  return id;
}

// The event a trigger names, by text: the exact name (any case, spaces squeezed) first, else the one event whose name differs only by a
// trailing "(external)" marker. -> { id } | { none: true } | { many: [names] }
const squeeze = n => String(n ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const unmarked = n => squeeze(n).replace(/\s*\(\s*external\s*\)$/, '');
export function eventForTrigger(name, state) {
  const events = Object.values(state.elements).filter(e => e.type === 'event');
  const exact = events.filter(e => squeeze(e.name) === squeeze(name));
  const hits = exact.length ? exact : events.filter(e => unmarked(e.name) === unmarked(name));
  if (hits.length === 1) return { id: hits[0].id };
  return hits.length ? { many: hits.map(e => e.name.trim()) } : { none: true };
}
const words = n => new Set(unmarked(n).split(' ').filter(Boolean));
// The book's event names, nearest to `name` first (shared words, then containing it), a short list
export function nearestEvents(name, state, limit = 6) {
  const want = words(name), key = unmarked(name);
  const score = n => [...words(n)].filter(w => want.has(w)).length + (unmarked(n).includes(key) || key.includes(unmarked(n)) ? 5 : 0);
  const names = [...new Set(Object.values(state.elements).filter(e => e.type === 'event').map(e => e.name.trim()))];
  return names.sort((a, b) => score(b) - score(a) || a.localeCompare(b)).slice(0, limit);
}
const manyWhy = names => `More than one event is called that: ${names.map(n => `“${n}”`).join(', ')}. Say which, with its full name.`;

export function runSliceFromAutomation({ sliceId, processor, whenEvent, viewSliceId = null }) {
  let state = projectState();
  const slice = state.slices[sliceId];
  if (!slice) return 'No such slice';
  if (slice.type !== 'SC') return 'Only a command slice can be run from an automation';
  const title = sliceTitle(slice, state);
  if (automated(slice)) return `${title} is already run by ${runBy(slice, state) || 'a processor'}`;
  if (!whenEvent?.trim()) return 'Say which event starts it';
  if (!processor?.trim()) return 'Name the processor that runs it';
  const which = eventForTrigger(whenEvent, state);
  if (which.many) return manyWhy(which.many);
  const view = viewSliceId ? state.slices[viewSliceId] : null;
  if (viewSliceId && (!view || view.type !== 'SV')) return 'Its first half has to be a view slice';
  if (view?.pairWith) return `${sliceTitle(view, state)} already starts another automation`;

  // The processor drives it now: its screens leave the slice (they stay in the book)
  slice.elements.filter(e => state.elements[e]?.type === 'screen').forEach(e => removeFromSlice(sliceId, e));
  appendEvent(EventTypes.SliceActorSet, { sliceId, actor: 'processor' });
  const viewId = view ? view.id : createSlice('SV', `${title}: to do`, { actor: 'processor', chapterId: slice.chapterId ?? null });
  if (view) {
    view.elements.filter(e => state.elements[e]?.type === 'screen').forEach(e => removeFromSlice(viewId, e));
    appendEvent(EventTypes.SliceActorSet, { sliceId: viewId, actor: 'processor' });
  } else placeSlices([viewId], { before: sliceId });
  appendEvent(EventTypes.SlicesPaired, { sliceId: viewId, pairWith: sliceId });

  state = projectState();
  const procId = elementNamed('processor', processor, state);
  const wanted = eventForTrigger(whenEvent, projectState());
  const eventId = wanted.id ?? elementNamed('event', whenEvent, projectState());
  const inView = projectState().slices[viewId].elements;
  if (!inView.includes(eventId)) addToSlice(viewId, 'event', { elementId: eventId });
  if (!inView.includes(procId)) addToSlice(viewId, 'processor', { elementId: procId });
  setTrigger(eventId, procId, true);
  return null;
}

// SC: Set Automation Trigger — an automation slice starts on this event instead (the one it had stops: the event stays in the book). An event
// the slice drew as an outcome comes off the slice (a trigger is not its result). Returns why not, or null.
export function setAutomationTrigger({ sliceId, whenEvent, mustExist = false }) {
  const state = projectState(), slice = state.slices[sliceId];
  if (!slice) return 'No such slice';
  if (!automated(slice)) return `${sliceTitle(slice, state)} is not run by an automation`;
  if (!whenEvent?.trim()) return 'Say which event starts it';
  const halves = [slice, state.slices[slice.pairWith]].filter(Boolean);
  const procs = halves.flatMap(s => s.elements).filter(e => state.elements[e]?.type === 'processor');
  if (!procs.length) return `${sliceTitle(slice, state)} has no processor`;
  const which = eventForTrigger(whenEvent, state);
  if (which.many) return manyWhy(which.many);
  if (which.none && mustExist) {   // an agent typing a name must name an event the book has: nothing is made
    const near = nearestEvents(whenEvent, state);
    return `No event called “${whenEvent.trim()}” — events in this book: ${near.length ? near.join(', ') : 'none yet'}`;
  }
  const eventId = which.id ?? elementNamed('event', whenEvent, state);
  halves.filter(s => s.type === 'SC' && s.elements.includes(eventId)).forEach(s => removeFromSlice(s.id, eventId));
  state.connections.filter(l => l.relation === 'trigger' && procs.includes(l.to) && l.from !== eventId).forEach(l => setTrigger(l.from, l.to, false));
  procs.forEach(p => setTrigger(eventId, p, true));
  return null;
}

export function runSliceByPerson({ sliceId }) {
  const state = projectState();
  const slice = state.slices[sliceId];
  if (!slice) return 'No such slice';
  if (slice.type !== 'SC') return 'Only a command slice is a person\'s step';
  if (!automated(slice)) return `${sliceTitle(slice, state)} is a person's step already`;
  // A processor sitting on the command slice itself (an automation with no view half) leaves it
  slice.elements.filter(e => state.elements[e]?.type === 'processor').forEach(e => removeFromSlice(sliceId, e));
  if (slice.pairWith) appendEvent(EventTypes.SlicesUnpaired, { sliceId });
  appendEvent(EventTypes.SliceActorSet, { sliceId, actor: 'screen' });
  return null;
}

// What the ⋮ offers: is it automated, and which view slices could be its first half
export const isAutomated = slice => automated(slice);
export const freeViewSlices = state => state.sliceOrder.map(id => state.slices[id]).filter(s => s && s.type === 'SV' && !s.pairWith);
