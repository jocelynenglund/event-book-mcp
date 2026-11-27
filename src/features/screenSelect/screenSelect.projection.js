// SCREEN SELECT - What the book's events say about it (called by core/projections.js once per event, after its own handling)
// A screen's property gets `select` ('many' | 'one'), `optionsFrom` (a view's name), `hidden` and `required` (true | false); a null or false takes it off.
import { ScreenSelectEvents as E } from './screenSelect.events.js';

export function projectScreenSelect(state, event) {
  if (event.type !== E.ScreenFieldSet) return;
  const d = event.data, el = state.elements[d?.elementId], key = s => String(s ?? '').trim().toLowerCase();
  const prop = el?.properties?.find(p => key(p.name) === key(d.field));
  if (!prop) return;
  if (d.select === 'many' || d.select === 'one') { prop.select = d.select; prop.optionsFrom = String(d.optionsFrom ?? ''); } else { delete prop.select; delete prop.optionsFrom; }
  if (d.hidden) prop.hidden = true; else delete prop.hidden;
  if (typeof d.required === 'boolean') prop.required = d.required; else delete prop.required;
}
