// ===========================================
// PROPERTIES - Commands
// SC: Add Property — a field on a sticky (the property sheet; the outline adds them its own way).
// A sticky in a refined slice takes refined (and built) back from every slice it sits in (see sliceRefined).
// ===========================================

import { appendEvent, EventTypes } from '../../core/eventStore.js';

const newPropertyId = () => 'prop_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

export function addProperty(elementId, name, propertyType = 'string', items = null) {
  const propertyId = newPropertyId();
  appendEvent(EventTypes.PropertyAdded, { elementId, propertyId, name, propertyType, ...(items ? { items } : {}) });
  return propertyId;
}

// SC: Remove Property — a field taken off a sticky
export function removeProperty(elementId, propertyId) {
  return appendEvent(EventTypes.PropertyRemoved, { elementId, propertyId });
}

// SC: Update Property — a field renamed, retyped, or given (or rid of) its item fields
export function updateProperty(elementId, propertyId, { name, propertyType = 'string', items = null }) {
  return appendEvent('PropertyUpdated', { elementId, propertyId, name, propertyType, items: items && items.length ? items : null });
}
