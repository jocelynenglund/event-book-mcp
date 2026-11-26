// ELEMENT MENU - Element Menu State (SV): what a sticky is, as its ⋮ menu needs it: its name and kind and the marks it
// carries (external, stored elsewhere, integration event, list, to-do); null when the sticky is gone
import { storageLabel } from '../storedElsewhere/storedElsewhere.rules.js'; // feature: stored-elsewhere

export function elementMenuState(book, elementId) {
  const el = book.elements[elementId];
  if (!el) return null;
  return { elementId, type: el.type, name: el.name, external: !!el.external, stored: !!el.storage, storedLabel: el.storage ? storageLabel(el.storage) : '', published: !!el.published, list: !!el.list, todo: !!el.todo }; // feature: stored-elsewhere (stored, storedLabel)
}
