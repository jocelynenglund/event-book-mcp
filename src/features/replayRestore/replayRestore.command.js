// REPLAY RESTORE - Restore Version, Undo Restore, Copy From Here (feature: replay-restore)
// Restore takes back every action after a step the way Undo takes back one (the events leave this device's history, the server is
// told which actions are undone), as one step: the next Undo (Ctrl+Z, ☰ ↶ Undo, the toast's Undo) brings them all back.
// Copy starts a new book from the events up to a step; the original is not touched.

import { getEventStream, setReplayLimit, replaceModelEvents, getCurrentModelId, canEditCurrent, createModel, openModel } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { undoBatch, syncModel } from '../sync/client.js';
import { restorePlan, bringBack } from './replayRestore.rules.js';

let lastRestore = null;   // { modelId, lastId, popped }: what the last restore took back, while nothing has changed since

const whole = () => { setReplayLimit(null); return getEventStream(); };

// A new book on this device (as Copy from here makes it; it is not kept on the server) from these events, named after the open book
function newBook(events, suffix) {
  const copy = events.map(e => ({ ...e }));
  const name = `${projectState(copy).modelName || 'Untitled'} · ${suffix}`;
  copy.push({ id: 'evt_rr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), type: 'ModelNamed', data: { name }, batch: 'b_rr_copy', timestamp: new Date().toISOString() });
  return { id: createModel(copy), name };
}

const nowLabel = () => new Date().toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// end: how many events the version has. The book as it is now is saved first as a book of its own ("… · before restore …"), so nothing
// taken back is ever lost. -> { taken, backup } (the events taken back, the backup book's name), or a message when it can't be done
export function restoreVersion(end) {
  if (!canEditCurrent()) return 'Read-only here: check it out to edit';
  const events = whole();
  const plan = restorePlan(events, end);
  if (!plan) return 'Nothing after that step to take back';
  const modelId = getCurrentModelId();
  const backup = newBook(events, `before restore ${nowLabel()}`);   // opens the backup: back to the book being restored
  openModel(modelId);
  replaceModelEvents(modelId, plan.kept);
  plan.undos.forEach(u => undoBatch(modelId, u.batch, u.ids));
  lastRestore = { modelId, lastId: plan.kept[plan.kept.length - 1]?.id ?? null, popped: plan.popped };
  return { taken: plan.popped.length, backup: backup.name, backupId: backup.id };
}

// Undo right after a restore brings back what it took. true when it did (nothing else was done since)
export function undoRestore() {
  const r = lastRestore;
  if (!r || r.modelId !== getCurrentModelId() || !canEditCurrent()) return false;
  const events = whole();
  if ((events[events.length - 1]?.id ?? null) !== r.lastId) { lastRestore = null; return false; }
  lastRestore = null;
  replaceModelEvents(r.modelId, [...events, ...bringBack(r.popped)]);
  try { syncModel(r.modelId); } catch (e) { /* kept books send on the next sync */ }
  return true;
}

// A new book from the events up to a step. -> its name
export function copyFromHere(end, whenLabel) {
  return newBook(whole().slice(0, end), `from ${whenLabel}`).name;
}
