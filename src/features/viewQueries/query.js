// ===========================================
// VIEW QUERIES - The query of a view scenario, as data and as text
// A scenario's query is free text. A spec parses it when it is plain comparisons, clauses { field, op, value } (op: "=", "starts",
// "<", ">", "contains"; value as typed, text). The text a person writes: `name = a*` (starts with a), `name = *a*` (contains a), `place > 5`, `place < 5`,
// `name = anna`; several clauses go between commas: `name = a*, place < 5`. The words work too: `name starts a`.
// ===========================================

export const queryOps = ['=', 'starts', '<', '>', 'contains'];

// One clause from its text ("name = a*"); null when it is not one
function parseClause(text) {
  const m = String(text).trim().match(/^([^\s=<>]+)\s*(?:(starts|contains)(?:\s+with)?\s+(.+)|(=|<|>)\s*(.+))$/i);
  if (!m) return null;
  const field = m[1];
  if (m[2]) return { field, op: m[2].toLowerCase(), value: m[3].trim() };
  const value = m[5].trim();
  if (m[4] !== '=') return { field, op: m[4], value };
  if (value.length > 2 && value.startsWith('*') && value.endsWith('*')) return { field, op: 'contains', value: value.slice(1, -1) };
  if (value.length > 1 && value.endsWith('*')) return { field, op: 'starts', value: value.slice(0, -1) };
  return { field, op: '=', value };
}

// A clause given as an object: { field, op, value }
function normalized(c) {
  if (!c || typeof c !== 'object' || !c.field || !queryOps.includes(c.op) || c.value === undefined || c.value === null || String(c.value) === '') return null;
  return { field: String(c.field), op: c.op, value: String(c.value) };
}

// A query as it is written, or as a list of clauses (text or objects): { query } (the clauses) or { error } (what is wrong, one line)
export function parseQuery(input) {
  if (input === undefined || input === null || input === '') return { query: [] };
  const clauses = Array.isArray(input) ? input : String(input).split(',').map(s => s.trim()).filter(Boolean);
  const query = [];
  for (const c of clauses) {
    const clause = typeof c === 'string' ? parseClause(c) : normalized(c);
    if (!clause) return { error: `"${typeof c === 'string' ? c : JSON.stringify(c)}" is not a query clause: write field = value (a* starts with, *a* contains), field > 5, field < 5` };
    query.push(clause);
  }
  return { query };
}

// The query as the spec passes it to a view: { name: { starts: "a" }, place: { gt: 1, lt: 5 } } (numbers as numbers for < and >)
const opName = { '=': 'eq', starts: 'starts', '<': 'lt', '>': 'gt', contains: 'contains' };
export function queryObject(query) {
  const out = {};
  (query || []).forEach(c => {
    const n = (c.op === '<' || c.op === '>') && c.value.trim() !== '' && !Number.isNaN(Number(c.value)) ? Number(c.value) : c.value;
    (out[c.field] ||= {})[opName[c.op]] = n;
  });
  return out;
}

// Example rows as text, one per line starting with "- ": "- name: anna, place: 1" (the plan files' and the outline's form)
export const rowText = row => `- ${Object.entries(row || {}).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join(', ')}`;

// ... and back: each "- key: value, key: value" line is a row (numbers and true / false as such); { rows } or { error }
export function parseRows(text) {
  const rows = [];
  for (const raw of String(text).split('\n').map(l => l.trim()).filter(Boolean)) {
    if (!raw.startsWith('- ')) return { error: `"${raw}" is not a row: one row per line, starting with "- ", as in "- name: anna, place: 1"` };
    const row = {};
    for (const part of raw.slice(2).split(',').map(s => s.trim()).filter(Boolean)) {
      const i = part.indexOf(':');
      if (i < 1) return { error: `"${part}" is not field: value in the row "${raw}"` };
      const v = part.slice(i + 1).trim();
      row[part.slice(0, i).trim()] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v === 'true' ? true : v === 'false' ? false : v;
    }
    rows.push(row);
  }
  return { rows };
}
