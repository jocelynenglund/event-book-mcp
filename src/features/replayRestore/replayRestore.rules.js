// REPLAY RESTORE - the rules (feature: replay-restore)
// Restoring a version takes back every action after a step of the replay, the way Undo takes back one: the events go from this
// device's history, and the server is told which actions are undone. What was taken back is kept for one way back (Undo right
// after). Pure functions of the events: no store, no DOM.

const fresh = prefix => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// events: the whole history; end: how many events the version at that step has.
// -> null when there is nothing after it, else
//    kept: the events that stay (those of a batch the step cuts in two get new ids and a new batch: the old batch is undone on the server whole)
//    popped: the events taken back, in order
//    undos: [{ batch, ids }] what the server is told is undone (a cut batch with all its old ids)
export function restorePlan(events, end) {
  if (end < 0 || end >= events.length) return null;
  const popped = events.slice(end);
  const cut = end > 0 && events[end - 1].batch && events[end - 1].batch === popped[0].batch ? events[end - 1].batch : null;
  const newBatch = cut ? fresh('b_rr') : null;
  const kept = events.slice(0, end).map(e => cut && e.batch === cut ? { ...e, id: fresh('evt_rr_'), batch: newBatch } : e);
  const poppedBatches = new Set(popped.map(e => e.batch).filter(Boolean));
  const byBatch = new Map();
  events.forEach(e => {
    if (!e.batch || !poppedBatches.has(e.batch)) return;
    byBatch.set(e.batch, [...(byBatch.get(e.batch) || []), e.id]);
  });
  return { kept, popped, undos: [...byBatch].map(([batch, ids]) => ({ batch, ids })) };
}

// What was taken back, as new events (new ids, one new batch per old one) so the server's list of undone actions never hides them again
export function bringBack(popped) {
  const batches = new Map();
  return popped.map(e => {
    if (e.batch && !batches.has(e.batch)) batches.set(e.batch, fresh('b_rr'));
    return { ...e, id: fresh('evt_rr_'), batch: e.batch ? batches.get(e.batch) : e.batch };
  });
}
