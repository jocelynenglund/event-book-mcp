// ===========================================
// BOARD - What a processor reads (shared by the board's stickies, the Outline's rows, the MCP outline and the
// information completeness check)
// An automation's input is always a read model (a view slice), fed by events (ours or another system's); the
// processor reads it, then triggers a command or translates into an event of its own. So an automation is shown by
// the view slice it reads ("reads Reminders Due"), not by the event that wakes it.
//   - the view slice of a read model: the one the processor shares an automation pair with, else the first view
//     slice that holds the read model (null when none does: it is then named by the read model)
//   - an automation made the older way (a trigger event, no read model) is shown by "⚡ on <event>", and is an
//     information completeness gap (see fieldSources/rules.js)
// ===========================================

import { sliceTitle } from '../../core/projections.js';

// The read models a processor reads (context links), each with the view slice that holds it:
// [{ readModelId, name, todo, sliceId, title }] (sliceId and title null when no view slice holds it)
export function processorReads(state, processorId) {
  const own = state.sliceOrder.map(id => state.slices[id]).filter(s => s?.elements.includes(processorId));
  const ownViews = own.flatMap(s => [s, state.slices[s.pairWith]]).filter(s => s?.type === 'SV');
  const views = state.sliceOrder.map(id => state.slices[id]).filter(s => s?.type === 'SV');
  return state.connections
    .filter(c => c.from === processorId && c.relation === 'context' && state.elements[c.to]?.type === 'readModel' && !state.elements[c.to].orphaned)
    .map(c => {
      const rm = state.elements[c.to];
      const view = ownViews.find(s => s.elements.includes(rm.id)) || views.find(s => s.elements.includes(rm.id)) || null;
      return { readModelId: rm.id, name: rm.name, todo: !!rm.todo, sliceId: view?.id || null, title: view ? sliceTitle(view, state) : null };
    });
}

// The events that wake a processor: [{ id, name, external }]
export function processorTriggers(state, processorId) {
  return state.connections
    .filter(c => c.to === processorId && c.relation === 'trigger' && state.elements[c.from] && !state.elements[c.from].orphaned)
    .map(c => ({ id: c.from, name: state.elements[c.from].name, external: !!state.elements[c.from].external }));
}

// Does the processor read a view slice that includes this event? Then the event just shows in that read slice, like any
// event it reads, and needs no "⚡ Trigger" label or "⚡ on" line.
export function readSliceHasEvent(state, processorId, eventId) {
  return processorReads(state, processorId).some(r => r.sliceId && state.slices[r.sliceId].elements.includes(eventId));
}

// An event that wakes the processor and is not (yet) drawn into a read slice it reads: the older way, still labelled
export function isLabelledTrigger(eventId, processorId, state) {
  return state.connections.some(c => c.from === eventId && c.to === processorId && c.relation === 'trigger')
    && !readSliceHasEvent(state, processorId, eventId);
}

// What a slice's row says its automation reads (the Outline's rows and the MCP outline): "reads <view slice title>"
// (sliceId: where a tap goes), or the read model's own name when no view slice holds it; the older way (a trigger event,
// nothing read), "⚡ on <event>". A view slice does not read itself. [{ label, name, sliceId }]; none for a slice no
// processor drives.
export function automationReads(state, slice) {
  const processors = slice.elements.map(id => state.elements[id]).filter(e => e?.type === 'processor');
  const seen = new Set();
  const reads = processors.flatMap(p => processorReads(state, p.id))
    .filter(r => (r.sliceId ? r.sliceId !== slice.id : !slice.elements.includes(r.readModelId)))
    .map(r => ({ label: 'reads', name: r.title || r.name, sliceId: r.sliceId }))
    .filter(r => !seen.has(r.name) && seen.add(r.name));
  const triggers = processors.flatMap(p => processorTriggers(state, p.id).filter(t => !readSliceHasEvent(state, p.id, t.id)))
    .filter(t => !slice.elements.includes(t.id))
    .map(t => ({ label: '⚡ on', name: t.name, sliceId: null }));
  return [...reads, ...triggers];
}

// The views the book already has that a processor could read instead of waking on its trigger event: each view slice that
// draws in one of the processor's trigger events and holds a read model the processor doesn't read yet, one entry per read
// model, the processor's own chapter first. [{ readModelId, readModelName, sliceId, title, events: [{ id, name }] }]
export function viewsDrawingTriggers(state, processorId) {
  const triggers = processorTriggers(state, processorId);
  if (!triggers.length) return [];
  const reading = new Set(processorReads(state, processorId).map(r => r.readModelId));
  const home = state.sliceOrder.map(id => state.slices[id]).find(s => s?.type !== 'SV' && s?.elements.includes(processorId))
    || state.sliceOrder.map(id => state.slices[id]).find(s => s?.elements.includes(processorId));
  return state.sliceOrder.map(id => state.slices[id]).filter(s => s?.type === 'SV' && !s.elements.includes(processorId))
    .flatMap(s => {
      const events = triggers.filter(t => s.elements.includes(t.id)).map(t => ({ id: t.id, name: t.name }));
      if (!events.length) return [];
      return s.elements.map(id => state.elements[id]).filter(el => el?.type === 'readModel' && !el.orphaned && !reading.has(el.id))
        .map(rm => ({ readModelId: rm.id, readModelName: rm.name, sliceId: s.id, title: sliceTitle(s, state), events, near: !!home?.chapterId && s.chapterId === home.chapterId }));
    })
    .map((v, i) => ({ v, i })).sort((a, b) => (b.v.near - a.v.near) || (a.i - b.i)).map(x => x.v);
}
