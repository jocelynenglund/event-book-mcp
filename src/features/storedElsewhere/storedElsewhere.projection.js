// STORED ELSEWHERE - What the book's events say about it (called by core/projections.js once per event, after its own handling)
// state.elements[id].storage: { kind, name? } of an event sticky kept elsewhere. The older ElementTableSet {table} reads as kind "legacy table"
// (name = the table when it is a string). A build without this feature draws such stickies as plain events.
import { StoredElsewhereEvents as E } from './storedElsewhere.events.js';
import { storageOf, legacyStorage } from './storedElsewhere.rules.js';

export function projectStoredElsewhere(state, event) {
  const el = state.elements[event.data?.elementId];
  if (!el) return;
  const storage = event.type === E.ElementStorageSet ? storageOf(event.data.kind, event.data.name) : event.type === 'ElementTableSet' ? legacyStorage(event.data.table) : undefined;
  if (storage === undefined) return;
  if (storage) el.storage = storage; else delete el.storage;
}
