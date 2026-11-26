// PROPERTIES - Property Edit Form (SV): the property being edited, as its form fills in (null: none, or gone).
// system: how it is set by the system (FieldSetBySystem: no source in the model on purpose), or null
// query: it is a query parameter (FieldMarkedQuery), and canQuery: only a read model's field can be one
// from: the field it comes from (FieldMapped), { elementId, sticky, field, text }, or null
import { fieldKey } from '../../core/constants.js';
import { mappingOf } from '../fieldMapping/mappings.js';
import { isQueryField } from '../viewQueries/queryFields.js';

export function propertyEditForm(book, elementId, propertyId) {
  const p = book.elements[elementId]?.properties.find(x => x.id === propertyId);
  if (!p) return null;
  const type = p.type || 'string';
  return { id: p.id, name: p.name, type, items: p.items || [], itemsText: (p.items || []).join(', '), isArray: type === 'array', generated: !!p.generated,
    query: isQueryField(book.elements[elementId], p.name), canQuery: book.elements[elementId].type === 'readModel',
    system: book.elements[elementId].setBySystem?.[fieldKey(p.name)]?.how || null,
    from: mappingOf(book, book.elements[elementId], p.name)?.from || null };
}
