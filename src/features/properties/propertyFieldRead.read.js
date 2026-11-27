// PROPERTIES - Property Field Read (SV): the property whose sheet is open in a book that can't be changed here, as it reads
// (null: none, or gone). Same facts as the edit form, none of its controls.
// system: how it is set by the system, or null. query: it is a query parameter. from: the field it comes from, or null.
import { fieldKey } from '../../core/constants.js';
import { mappingOf } from '../fieldMapping/mappings.js';
import { isQueryField } from '../viewQueries/queryFields.js';

export function propertyFieldRead(book, elementId, propertyId) {
  const el = book.elements[elementId];
  const p = el?.properties.find(x => x.id === propertyId);
  if (!p) return null;
  const type = p.type || 'string';
  return { id: p.id, name: p.name, type, itemsText: (p.items || []).join(', '), generated: !!p.generated,
    query: isQueryField(el, p.name), system: el.setBySystem?.[fieldKey(p.name)]?.how || null,
    from: mappingOf(book, el, p.name)?.from || null };
}
