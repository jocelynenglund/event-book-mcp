// ===========================================
// PAD - Bulk preview (SV: Pad Bulk Preview)
// What ＋ Events will add, before anything is: one note per line of the list (padBulk.rules.js), as orange (event) notes, laid out as
// a grid of up to five a row from the middle of the view (`at`, a point on the canvas), moved down below whatever is in the
// way. `notes` is what the button records ({ x, y, colour: "orange", text }); `lines` the first few, each a title and its fields, for
// a short preview, and `more` how many were left off it.
// ===========================================

import { gridFor } from './sketch.js';
import { bulkLines } from './padBulk.rules.js';
import { titleAndBody } from './padNotes.read.js';

const PREVIEW = 5;
const plural = n => `${n} ${n === 1 ? 'event' : 'events'}`;

export function padBulkPreview(state, { text = '', at = { x: 0, y: 0 } } = {}) {
  const texts = bulkLines(text), spots = gridFor(state.pad || { notes: {}, frames: {} }, texts.length, at);
  const notes = texts.map((t, i) => ({ ...spots[i], colour: 'orange', text: t }));
  const lines = notes.slice(0, PREVIEW).map(n => { const { title, bodyLines } = titleAndBody(n.text); return { title, fields: bodyLines.map(l => l.replace(/^-\s*/, '')) }; });
  return { count: notes.length, countText: plural(notes.length), lines, more: Math.max(0, notes.length - PREVIEW), label: notes.length ? `Add ${plural(notes.length)}` : 'Add events', canAdd: notes.length > 0, notes };
}
