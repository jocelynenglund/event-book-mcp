// STORED ELSEWHERE - Command (Set Stored Elsewhere): say where an event sticky is kept instead of events, or (kind "") that it is an
// event again. A refusal comes back as its words (a string); a change as { elementId, storage }; nothing to do as { elementId, storage, changed: false }.
import { appendEvent } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { StoredElsewhereEvents } from './storedElsewhere.events.js';
import { storageOf, MAX_KIND, MAX_NAME } from './storedElsewhere.rules.js';

export function setStoredElsewhere({ elementId, kind, name }) {
  const el = projectState().elements[elementId];
  if (!el) return 'That sticky is gone';
  if (el.type !== 'event') return 'Only an event can be stored elsewhere';
  const storage = storageOf(kind, name);
  if (storage && storage.kind.length > MAX_KIND) return `The kind is at most ${MAX_KIND} letters`;
  if (storage?.name && storage.name.length > MAX_NAME) return `The name is at most ${MAX_NAME} letters`;
  const had = el.storage || null;
  if ((had?.kind || '') === (storage?.kind || '') && (had?.name || '') === (storage?.name || '')) return { elementId, storage, changed: false };
  appendEvent(StoredElsewhereEvents.ElementStorageSet, { elementId, kind: storage?.kind || '', ...(storage?.name ? { name: storage.name } : {}) });
  return { elementId, storage, changed: true };
}
