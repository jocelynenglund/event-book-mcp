// SCENARIOS - Scenario Element Fields (SV): the value boxes a sticky gets in the scenario editor: one per property (a list
// property with item fields gets a line per item), filled with the values so far, and whether it is a list read model (rows)
// rather than one record. prefix says which part of the sheet the boxes belong to (given, when, then-event, then-rm, then-row).
// null when the sticky is gone.
import { propLabel, fieldKey } from '../../core/constants.js';
import { requiredHint } from '../screenSelect/screenSelect.label.js'; // feature: screen-select

export function scenarioElementFields(book, elementId, prefix = '', values = {}) {
  const el = book.elements[elementId];
  if (!el) return null;
  return {
    elementId, name: el.name, type: el.type, prefix,
    isList: el.type === 'readModel' && !!(el.list || el.todo),
    fields: (el.properties || []).map(p => ({
      elementId, prefix, name: p.name, type: p.type, label: propLabel(p),
      items: p.type === 'array' && p.items?.length ? p.items : null,
      value: values?.[p.name] ?? '',
      ...(el.type === 'command' && (el.mappings?.[fieldKey(p.name)]?.sources || []).some(s => book.elements[s.elementId]?.properties?.some(q => fieldKey(q.name) === fieldKey(p.name) && q.required === true)) ? { hint: requiredHint(p.name) } : {})   // feature: screen-select
    }))
  };
}
