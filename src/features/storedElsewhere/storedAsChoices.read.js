// STORED ELSEWHERE - Stored As Choices (SV): what the "Stored as…" sheet of an event sticky offers.
// -> { elementId, name, kind, storedName, stored, chips: [{ kind, recent }] } (null when the sticky is gone or is not an event):
// the sticky's own kind and name, and the kinds to pick from: the book's recent ones first (most used first), then the suggested ones
import { projectState } from '../../core/projections.js';
import { storageLabel, SUGGESTED_KINDS } from './storedElsewhere.rules.js';

export function storedAsChoices(state, elementId) {
  const el = state.elements[elementId];
  if (!el || el.type !== 'event') return null;
  const used = new Map();
  Object.values(state.elements).forEach(e => { if (e.storage) used.set(e.storage.kind, (used.get(e.storage.kind) || 0) + 1); });
  const recent = [...used.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([kind]) => kind);
  const chips = [...recent.map(kind => ({ kind, recent: true })), ...SUGGESTED_KINDS.filter(k => !used.has(k)).map(kind => ({ kind, recent: false }))];
  return { elementId, name: el.name, kind: el.storage?.kind || '', storedName: el.storage?.name || '', stored: !!el.storage, label: storageLabel(el.storage), chips };
}

// The same, for the book as it stands now (the sheet opens on a tap)
export const storedAsChoicesNow = elementId => storedAsChoices(projectState(), elementId);
