// ===========================================
// PAD - What a plain note says, read leniently (SV: Pad Note Text)
// A note is nothing but the text she typed. Its colour says what it stands for (blue a command, orange an event, green a
// view, red a hotspot, white a plain note). Its first non-empty line is its name, in Title Case; every line after it is a field: a leading "-", "•", "*" (or a
// dash) is stripped, the words become camelCase, and a "(…)" at the end is the field's note (kept, since a field has no
// description of its own). Empty lines are ignored. Nothing here refuses: a note that is nothing but a name has no fields.
// ===========================================

import { KIND_OF } from './sketch.js';
import { propertyTypes } from '../../core/constants.js';
import { storageMarker } from '../storedElsewhere/storedElsewhere.rules.js'; // feature: stored-elsewhere

const BULLET = /^\s*(?:[-•*·–—]+\s*)+/;
const words = text => String(text ?? '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// "attempt recall Booking" → "Attempt Recall Booking": each word's first letter, the rest as typed
export const titleCase = text => words(text).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

// "preferred store" → preferredStore, "PrimaryWindow" → primaryWindow, "cycle_id" → cycleId, "Cycle ID" → cycleId
export function camelCase(text) {
  const soft = w => (w === w.toUpperCase() ? w.toLowerCase() : w);   // an all-capitals word is shouted, not spelt that way
  return words(text).map((w, i) => (i === 0 ? soft(w)[0].toLowerCase() : soft(w)[0].toUpperCase()) + soft(w).slice(1)).join('');
}

// The words after "field:" that are a type, not a value: the types a field can have ("amount: number"), and bool for boolean
const TYPES = new Set([...propertyTypes, 'bool']);
const TYPE_NAME = { bool: 'boolean' };
const FIELD_VALUE = /^([^:()]+?)\s*:\s*(.+)$/s;

// One line after the name → { line, name, note } (null when there is nothing in it); "name: <known type>" also says its `type`, and any
// other "name: value" is an example: `value` (the name as typed in `as`, the words she wrote, for matching a real field case- and space-insensitively)
function fieldOf(raw) {
  const line = raw.replace(BULLET, '').trim();
  const colon = line.match(FIELD_VALUE);
  if (colon && camelCase(colon[1])) {
    const right = colon[2].trim(), typed = right.match(/^([A-Za-z]+)\s*(?:\(([^()]*)\))?$/), word = typed?.[1].toLowerCase();
    if (word && TYPES.has(word)) return { line, name: camelCase(colon[1]), note: typed[2]?.trim() || null, type: TYPE_NAME[word] || word };
    return { line, name: camelCase(colon[1]), as: colon[1].trim(), note: null, value: right.replace(/^(["'“])(.*)(["'”])$/, '$2') };
  }
  const m = line.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  const name = camelCase(m ? m[1] : line);
  return name ? { line, name, note: m && m[2].trim() ? m[2].trim() : null } : null;
}

// A note's whole text on one line, as a comment or a description line says it: "Is the window right? — ask ops"
export const oneLine = text => String(text ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).join(' — ');

// An orange note whose name says another system records it: "Payment Received (external)" or "external: Payment Received" (any case).
// -> { external, name } with the marker taken off the name ("Payment Received"); a name without a marker is { external: false, name: as typed }
const EXTERNAL_SUFFIX = /\s*\(\s*external\s*\)\s*$/i, EXTERNAL_PREFIX = /^\s*external\s*:\s*/i;
export function externalName(firstLine) {
  const line = String(firstLine ?? ''), bare = line.replace(EXTERNAL_SUFFIX, '').replace(EXTERNAL_PREFIX, '');
  return { external: bare !== line && !!bare.trim(), name: bare !== line && bare.trim() ? bare.trim() : line };
}

// colour: blue | orange | green. -> { kind: command | event | readModel | hotspot | note, name, external (true only on an orange note marked external), storage ({ kind } on an orange note marked "(table)", "(config)"… stored elsewhere), fields: [{ line, name, note, type? }] }
// A note with a field line that carries a value ("- contractNumber: 99999", not a type) is an EXAMPLE of its event, command or view, not its definition:
// `example: true`, no `fields` (it adds and changes none), and `values` says what it shows: [{ name: camelCase field, as: the words typed, value: the text, or null for a bare "- EventDate" }]
export function parseNote(text, colour) {
  const lines = String(text ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean), kind = KIND_OF[colour] || null;
  const marked = kind === 'event' ? externalName(lines[0]) : { external: false, name: lines[0] || '' };
  const { storage, name } = kind === 'event' && !marked.external ? storageMarker(marked.name) : { storage: null, name: marked.name };   // feature: stored-elsewhere
  const { external } = marked;
  const fields = lines.slice(1).map(fieldOf).filter(Boolean), read = { kind, name: titleCase(name), ...(external ? { external: true } : {}), ...(storage ? { storage } : {}) };   // feature: stored-elsewhere
  if (!fields.some(f => f.value !== undefined)) return { ...read, fields };
  return { ...read, example: true, fields: [], values: fields.map(f => ({ name: f.name, as: f.as || f.line, value: f.value ?? null })) };
}
