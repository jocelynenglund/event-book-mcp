// ===========================================
// PAD - A strip of example notes is a scenario, and back (pure)
// Example notes (padNote.rules.js: an event, command or view note whose field lines carry values, "- contractNumber: 99999") laid in a row, left to
// right, say a Given / When / Then. Read by x (ties: by y): the notes before the first blue note are Given, the blue note is the When, the notes after
// it are Then (events). With no blue note, all but the last are Given and the last is Then. A green note ends a view's scenario: it is the Then,
// its values the row (it is the last, or the strip sits in a view's frame, a frame with a green note and no blue one). A strip is not made of
// anything else, has one command and one view at most, and a view has no command: `why` says what is wrong, else null.
// The scenario note it makes is the Pad's own scenario text (padScenario.rules.js): "G: Name (field: value, …)", A: for the next one, W:, T:. A value
// is written under the name of the field the event really has when it is told (case and spaces do not matter: "Personal Number" is personalNumber);
// a field line with no value ("- EventDate") is left out. What is wrong with the names shows as the scenario note's usual warnings, nothing is refused here.
// And back: a scenario note's Given / When / Then drawn as a row of example notes below it, coloured by kind (an event another system records, yellow).
// ===========================================

import { parseNote, titleCase, externalName } from './padNote.rules.js';
import { readScenario, namesKnown } from './padScenario.rules.js';
import { NOTE_SIZE, NOTE_GAP, KIND_OF } from './sketch.js';

const lower = s => String(s ?? '').trim().toLowerCase();
const compact = s => lower(s).replace(/[^\p{L}\p{N}]+/gu, '');
const COLOUR_OF = { event: 'orange', command: 'blue', readModel: 'green' };
const TYPE_OF = { event: 'event', command: 'command', readModel: 'readModel' };

// The fields an event, command or view really has, by name: the board's stickies of that name and the Pad's definition notes (example notes define nothing).
// -> [name] ([] when nothing says)
export function realFields(state, kind, name) {
  const wanted = lower(name), out = [];
  Object.values(state.elements || {}).filter(e => e.type === TYPE_OF[kind] && lower(titleCase(e.name)) === wanted).forEach(e => (e.properties || []).forEach(p => out.push(p.name)));
  Object.values(state.pad?.notes || {}).forEach(n => {
    const p = KIND_OF[n.colour] === kind && parseNote(n.text, n.colour);
    if (p && p.name.toLowerCase() === wanted) p.fields.forEach(f => out.push(f.name));
  });
  return [...new Set(out)];
}

// Is this event another system's, on the board or on the Pad?
export function isExternal(state, name) {
  const wanted = lower(name);
  return Object.values(state.elements || {}).some(e => e.type === 'event' && e.external && lower(titleCase(e.name)) === wanted)
    || Object.values(state.pad?.notes || {}).some(n => n.colour === 'orange' && externalName(n.text.split('\n')[0]).external && lower(parseNote(n.text, 'orange').name) === wanted);
}

// A note as an item of the strip: { noteId, kind, name, external, values: [[field, value]], warnings }
function itemOf(state, note) {
  const parsed = parseNote(note.text, note.colour), real = realFields(state, parsed.kind, parsed.name), warnings = [];
  const values = (parsed.values || []).filter(v => v.value !== null && v.value !== '').map(v => {
    const field = real.find(f => compact(f) === compact(v.as) || compact(f) === compact(v.name)) || v.name;
    if (real.length && !real.some(f => f === field)) warnings.push(`${parsed.name} has no field ${v.name}`);
    return [field, v.value];
  });
  return { noteId: note.id, kind: parsed.kind, name: parsed.name, external: !!parsed.external, values, warnings };
}

// The smallest frame that holds all of these notes (by their middles), or null
export function frameHolding(pad, notes) {
  const mid = NOTE_SIZE / 2;
  return Object.values(pad?.frames || {}).filter(f => notes.every(n => n.x + mid >= f.x && n.x + mid <= f.x + f.w && n.y + mid >= f.y && n.y + mid <= f.y + f.h))
    .sort((a, b) => a.w * a.h - b.w * b.h)[0] || null;
}

// The notes (ids) as a strip: { ok, why, kind: 'command' | 'readModel', given: [item], when: item | null, then: [item], items, frame, defaultName, at: { x, y }, warnings }
export function readStrip(state, noteIds) {
  const pad = state.pad || { notes: {}, frames: {} }, notes = [...new Set(noteIds)].map(id => pad.notes[id]).filter(Boolean).sort((a, b) => a.x - b.x || a.y - b.y);
  const no = why => ({ ok: false, why, kind: 'command', given: [], when: null, then: [], items: [], frame: null, defaultName: 'Scenario', at: { x: 0, y: 0 }, warnings: [] });
  if (notes.length < 2) return no('Select two or more example notes in a row');
  if (notes.some(n => !['blue', 'orange', 'green'].includes(n.colour))) return no('A strip is event, command and view notes only');
  const items = notes.map(n => itemOf(state, n)), blues = items.filter(i => i.kind === 'command'), greens = items.filter(i => i.kind === 'readModel');
  const frame = frameHolding(pad, notes), inView = !!frame && Object.values(pad.notes).some(n => n.colour === 'green' && frameHolding(pad, [n])?.id === frame.id) && !Object.values(pad.notes).some(n => n.colour === 'blue' && frameHolding(pad, [n])?.id === frame.id);
  if (blues.length > 1) return no('A scenario has one command: select one blue note');
  if (greens.length > 1) return no('A scenario has one view: select one green note');
  if (greens.length && blues.length) return no('A view has no command: leave the blue note out');
  if (greens.length && items[items.length - 1] !== greens[0] && !inView) return no('The view note goes last in the row');
  const view = greens[0] || null, rest = view ? items.filter(i => i !== view) : items, at = { x: notes[0].x, y: Math.max(...notes.map(n => n.y)) + NOTE_SIZE + NOTE_GAP };
  let given, when = null, then;
  if (view) { given = rest; then = [view]; }
  else if (blues.length) { const b = items.indexOf(blues[0]); given = items.slice(0, b); when = blues[0]; then = items.slice(b + 1); }
  else { given = items.slice(0, -1); then = items.slice(-1); }
  return { ok: true, why: null, kind: view ? 'readModel' : 'command', given, when, then, items, frame, defaultName: frame?.name.trim() || 'Scenario', at, warnings: items.flatMap(i => i.warnings) };
}

// "Name (field: value, …)", just the name when it shows no values
const say = item => `${item.name}${item.values.length ? ` (${item.values.map(([k, v]) => `${k}: ${v}`).join(', ')})` : ''}`;

// The scenario note's text: its name (a leading ★ for a must-have), then G: / A: / W: / T: lines
export function stripText(strip, { name = '', mustHave = false } = {}) {
  const title = `${mustHave ? '★ ' : ''}${String(name).trim() || strip.defaultName}`, out = [title];
  const list = (first, items) => items.forEach((item, i) => out.push(`${i ? 'A' : first}: ${say(item)}`));
  if (strip.given.length) list('G', strip.given); else if (strip.when || strip.then.length) out.push('G: nothing');
  if (strip.when) out.push(`W: ${say(strip.when)}`);
  if (strip.kind === 'readModel') {
    const [view] = strip.then;
    out.push(`T: ${view.name}`);
    if (view.values.length) out.push(`- ${view.values.map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  } else list('T', strip.then);
  return out.join('\n');
}

// What the strip will say, as the Make scenario sheet shows it: { name, text, rows: [{ label, text }], warnings }
export function previewStrip(state, noteIds, { name = null, mustHave = false } = {}) {
  const strip = readStrip(state, noteIds);
  if (!strip.ok) return { ok: false, why: strip.why, name: '', text: '', rows: [], warnings: [], defaultName: strip.defaultName, at: strip.at, frameId: null };
  const text = stripText(strip, { name: name ?? '', mustHave }), known = namesKnown(state);
  // Read back as the Pad will read it: what it can not place is the scenario note's usual warning (the names are the strip's own notes, so they are known)
  const read = readScenario(text, namesKnown(state).all, strip.kind), warnings = [...strip.warnings, ...read.problems];
  const rows = text.split('\n').slice(1).map(line => { const m = line.match(/^([GAWT]):\s*(.*)$/); return m ? { label: m[1] === 'A' ? '' : m[1], text: m[2] } : { label: '', text: line }; });
  return { ok: true, why: null, name: strip.defaultName, text, rows, warnings, defaultName: strip.defaultName, at: strip.at, frameId: strip.frame?.id || null };
}

// ---------- and back: a scenario note as a row of example notes ----------

// The example note's text: its name, then "- field: value" for each value
const noteText = (name, values, external) => [external ? `${name} (external)` : name, ...values.map(([k, v]) => `- ${k}: ${v}`)].join('\n');

// A scenario note's Given / When / Then as example notes, in reading order: [{ colour, text }], with `left` saying what could not be drawn
// (a rejection, a view's second row, a Then that is nothing)
export function layOutOf(state, noteId) {
  const note = state.pad?.notes?.[noteId];
  if (note?.colour !== 'scenario') return { notes: [], left: [], kind: 'command' };
  const known = namesKnown(state), left = [];
  const asView = read => !!(read.then?.rows || read.when?.query || read.then?.items?.some(i => known.views.has(lower(i.name)) && !known.events.has(lower(i.name))));
  const view = readScenario(note.text, known.all, 'readModel'), isView = asView(view), read = isView ? view : readScenario(note.text, known.all, 'command');
  const out = [], draw = (kind, name, values) => out.push({ colour: COLOUR_OF[kind], text: noteText(name, Object.entries(values || {}), kind === 'event' && isExternal(state, name)) });
  read.given.forEach(g => draw('event', g.name, g.values));
  if (read.when?.name) draw('command', read.when.name, read.when.values);
  else if (read.when?.query) left.push(`the query ${read.when.query}`);
  const then = read.then;
  if (then?.kind === 'events') {
    then.items.forEach(t => draw(isView ? 'readModel' : 'event', t.name, isView ? { ...t.values, ...(then.rows?.[0] || {}) } : t.values));
    if (isView && then.rows?.length > 1) left.push(`${then.rows.length - 1} more ${then.rows.length === 2 ? 'row' : 'rows'}`);
  } else if (then) left.push(`${then.kind}: ${then.reason}`);
  return { notes: out, left, kind: isView ? 'readModel' : 'command' };
}

// Where each of `count` notes goes: a row below the note, left to right, moved down until nothing is in its way
export function rowBelow(pad, note, count) {
  const step = NOTE_SIZE + NOTE_GAP, w = count * step - NOTE_GAP, x = note.x;
  let y = note.y + NOTE_SIZE + NOTE_GAP;
  const taken = [...Object.values(pad.notes).filter(n => n.id !== note.id).map(n => ({ x: n.x, y: n.y, w: NOTE_SIZE, h: NOTE_SIZE }))];
  const hit = () => taken.filter(r => r.x < x + w && r.x + r.w > x && r.y < y + NOTE_SIZE && r.y + r.h > y);
  for (let h = hit(); h.length && count; h = hit()) y = Math.max(...h.map(r => r.y + r.h)) + NOTE_GAP;
  return Array.from({ length: count }, (_, i) => ({ x: x + i * step, y }));
}
