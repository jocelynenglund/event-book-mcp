// BOARD SHEETS - the views of "＋ Several…", adding many events to a slice from one box of lines.
// Several Events Form (SV): the sheet's heading, and which slice the events go into; null when the slice is gone.
// Several Events Preview (SV): what each typed line will do, one per line, blank lines ignored, and how many the button adds.
//   Each line is `EventName(field, field)`, the fields optional and written the way a plan file's `fields` are
//   (name:type, items[], lines[]{sku, qty}); an event the book already has (same name, any case) is read here as it is.
//   extra: for an existing event, the line's fields it lacks (named, with the ones it has): they are not added
//   status: new · existing (will be read here) · here (the slice already has it) · twice (listed above) · error (note says why)
import { sliceTitle } from '../../../core/projections.js';
import { propLabel, parsePropertyText } from '../../../core/constants.js';
import { parseFieldList } from '../../fieldMapping/fieldText.js';

export function severalEventsForm(book, sliceId) {
  const slice = book.slices[sliceId];
  if (!slice) return null;
  return { sliceId, sliceName: sliceTitle(slice, book), heading: slice.type === 'SV' ? 'Several events it reads' : 'Several events' };
}

const nameKey = name => name.trim().toLowerCase();

// One line → { name, parsed: [{name, type, items?}] } or { error }
function readLine(line) {
  const open = line.indexOf('(');
  const name = (open === -1 ? line : line.slice(0, open)).trim();
  if (!name) return { error: 'no event name' };
  if (open === -1) return /[()]/.test(name) ? { error: 'a ) with no ( before it' } : { name, parsed: [] };
  if (!line.endsWith(')')) return { error: 'missing the closing )' };
  const { text, mappings, error } = parseFieldList(line.slice(open + 1, -1));
  if (error) return { error };
  if (mappings.length) return { error: 'a field cannot come from another sticky here: add it afterwards' };
  return { name, parsed: parsePropertyText(text, 'string').parsed };
}

export function severalEventsPreview(book, sliceId, text) {
  const slice = book.slices[sliceId];
  if (!slice) return null;
  const events = Object.values(book.elements).filter(el => el.type === 'event');
  const seen = new Set();
  const rows = String(text ?? '').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const read = readLine(line);
    const row = { line, status: 'error', name: line, fields: [], parsed: [], note: read.error || '', extra: '', add: false, elementId: null };
    if (read.error) return row;
    Object.assign(row, { name: read.name, fields: read.parsed.map(propLabel), parsed: read.parsed });
    if (seen.has(nameKey(read.name))) return Object.assign(row, { status: 'twice', note: 'listed twice: only the first counts' });
    seen.add(nameKey(read.name));
    const have = events.find(el => nameKey(el.name) === nameKey(read.name));
    if (!have) return Object.assign(row, { status: 'new', add: true });
    const own = new Set((have.properties || []).map(p => nameKey(p.name)));
    const other = read.parsed.map(p => p.name).filter(n => !own.has(nameKey(n)));
    Object.assign(row, { name: have.name, elementId: have.id });
    if (slice.elements.includes(have.id)) return Object.assign(row, { status: 'here', note: 'already in this slice' });
    const has = (have.properties || []).map(propLabel);
    const extra = other.length ? `${other.join(', ')} ${other.length === 1 ? "isn't" : "aren't"} on ${have.name} and won't be added (${has.length ? `it has: ${has.join(', ')}` : 'it has no fields'})` : '';
    return Object.assign(row, { status: 'existing', add: true, note: 'already exists: will be read here', extra });
  });
  const count = rows.filter(r => r.add).length;
  return { sliceId, rows, add: { count, label: count ? `Add ${count} ${count === 1 ? 'event' : 'events'}` : 'Add events' } };
}
