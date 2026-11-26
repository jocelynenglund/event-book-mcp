// ===========================================
// BOARD - Add Several Events (＋ Several… in a slice's events drawer)
// ===========================================
// One line each, `EventName(field, field)`: a new sticky with its fields, or the existing event of that name, read here as it
// is (its own fields are left alone). Lines that can't be read are left out. Everything is recorded in one go, so one Undo
// takes it all back. Returns how many events it put in the slice.

import { projectState } from '../../core/projections.js';
import { addToSlice } from './command.js';
import { addProperty } from '../properties/command.js';
import { severalEventsPreview } from './sheets/severalEvents.read.js';

export function addSeveralEvents(sliceId, text) {
  const preview = severalEventsPreview(projectState(), sliceId, text);
  const rows = (preview?.rows || []).filter(r => r.add);
  rows.forEach(row => {
    if (row.elementId) { addToSlice(sliceId, 'event', { elementId: row.elementId }); return; }
    const id = addToSlice(sliceId, 'event', { name: row.name });
    row.parsed.forEach(p => addProperty(id, p.name, p.type, p.items));
  });
  return rows.length;
}
