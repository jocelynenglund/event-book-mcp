// ===========================================
// VIEW QUERIES - A read model's query parameters, as the stickies draw them
// A field the caller asks the view with wears a ? in front: ?name, ?place[].
// ===========================================

import { fieldKey, propLabel } from '../../core/constants.js';

export const isQueryField = (el, name) => !!el?.queryFields?.[fieldKey(name)];

// The field as a sticky draws it: its label, with ? in front when it is a query parameter
export const fieldLabel = (el, p) => (isQueryField(el, p.name) ? '?' : '') + propLabel(p);

// The names of a read model's query parameters, in the order it lists its fields
export const queryParametersOf = el => (el?.properties || []).filter(p => isQueryField(el, p.name)).map(p => p.name);
