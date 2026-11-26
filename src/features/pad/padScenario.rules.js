// ===========================================
// PAD - What a scenario note says, read leniently (SV: Pad Scenario Text)
// A scenario note (warm grey, like the board's Given / When / Then row) is typed freely: its first line is the scenario's name (a leading ★ marks a must-have), then lines that
// start with Given, When or Then (any case; a colon after is fine). An "And …" line goes on with the keyword before it.
// Each keyword also has a short form with its colon: G: = Given, W: = When, T: = Then, A: or &: = And, and Q: = a view's When query ("Q: name = a*",
// the text after it is the query, drawn as W query (name = a*)). The long words need no colon, the short ones do.
//   Given  one or more events: separate lines, commas, or " and " ("Given Product Configured and Basket Opened"). " and " only splits
//          when every piece is a known event (the whole phrase is tried first: "Search and Filter Applied" is one event). "×2" or "x2"
//          repeats an event: each Given line is one event of the history, in order. "Given nothing" starts from an empty history.
//   When   the command (one).
//   Then   an event (or, for a view, the view), or "rejected: <reason>", or "nothing: <reason>". A view's Then may be followed by one row
//          per line starting "- " ("- name: anna, place: 1"), or "(empty)" for no rows.
//   A view's When is its query, free text: "When query (name = a*, place > 5)" (kept as written).
// Values go in brackets on any of them: "Product Configured (unitPrice: 10, tags: red, blue)"; a piece with no colon goes on the
// value before it. Names are Title Case, fields camelCase (as padNote.rules.js). Nothing here refuses: what can not be placed is
// listed in `problems`, never dropped without a word. One reader serves the drawing, Make chapter and Update chapter.
// ===========================================

import { titleCase, camelCase, externalName } from './padNote.rules.js';
import { storageMarker } from '../storedElsewhere/storedElsewhere.rules.js'; // feature: stored-elsewhere

const KEYWORD = /^(given|when|then|and)\b\s*:?\s*(.*)$/i;
const SHORT = /^(?:([gwtqa])|(&))\s*:\s*(.*)$/i;                        // G: W: T: Q: A: &:
const SHORT_WORD = { g: 'given', w: 'when', t: 'then', q: 'when', a: 'and', '&': 'and' };
// A line's keyword and what follows it: { word, text } (a Q: line is a When whose text is the query: "query (name = a*)"), or null
function keywordOf(raw) {
  const long = raw.match(KEYWORD), short = !long && raw.match(SHORT);
  if (long) return { word: long[1].toLowerCase(), text: long[2].trim() };
  if (!short) return null;
  const letter = (short[1] || short[2]).toLowerCase(), rest = short[3].trim();
  return { word: SHORT_WORD[letter], text: letter === 'q' ? `query ${rest.startsWith('(') ? rest : `(${rest})`}` : rest };
}
const LABEL = { given: 'G', when: 'W', then: 'T' };
const NOTHING = /^(?:nothing|none|no events?|-|–|—)$/i;               // "Given nothing"
const BULLET = /^[-•*]\s+\S/;                                                // "- name: anna"
const TIMES = /\s*(?:×|\bx)\s*(\d+)\s*$/i;                              // "×2", "x2"
const OUTCOME = /^(rejected|nothing)\s*:\s*(.*)$/i;
const REFUSAL = /^[✗✘✕]\s*(.*)$/;                                       // "Then ✗ Already sent" = rejected: Already sent                     // "Then rejected: …", "Then nothing: …"
const lines = text => String(text ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
const key = name => titleCase(name).toLowerCase();

// The note as the drawing needs it: title as typed, name without the star, and the rows: { kw, label, continues, text }.
// A line that starts no keyword is a row of its own with no kw (drawn as typed).
export function scenarioLines(text) {
  const [first = '', ...rest] = lines(text);
  let kw = null;
  const rows = rest.map(raw => {
    if (kw === 'then' && (BULLET.test(raw) || /^\(empty\)$/i.test(raw))) return { kw, label: '', continues: true, text: raw };       // a view's row, under its Then
    const found = keywordOf(raw), continues = found?.word === 'and';
    if (!found || (continues && !kw)) return { kw: null, label: '', continues: false, text: raw };
    if (!continues) kw = found.word;
    return { kw, label: continues ? '' : LABEL[kw], continues, text: found.text };
  });
  // A must-have starts with ★ or a plain * (easier to type; Jocelyn 2026-11-25)
  const must = /^[★*]\s*/.test(first);
  return { title: first, name: first.replace(/^[★*]\s*/, '').trim(), mustHave: must, rows };
}

// "a, b" at the top level (not inside brackets)
function topSplit(text) {
  const parts = [];
  let depth = 0, at = 0;
  [...text].forEach((ch, i) => {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && !depth) { parts.push(text.slice(at, i)); at = i + 1; }
  });
  parts.push(text.slice(at));
  return parts.map(p => p.trim()).filter(Boolean);
}

// "unitPrice: 10, tags: red, blue" → { unitPrice: '10', tags: 'red, blue' }
function valuesOf(text) {
  const values = {};
  let last = null;
  for (const piece of text.split(',')) {
    const m = piece.match(/^\s*([^:]+?)\s*:\s*(.*?)\s*$/s);
    const field = m && camelCase(m[1]);
    if (field) { last = field; values[field] = m[2]; }
    else if (last && piece.trim()) values[last] += `, ${piece.trim()}`;
  }
  Object.keys(values).forEach(k => { values[k] = values[k].replace(/^(["'“])(.*)(["'”])$/, '$2'); });
  return values;
}

// "A and B" at the top level, not inside brackets
function andSplit(text) {
  const masked = text.replace(/\([^()]*\)/g, m => '_'.repeat(m.length)), out = [];
  let at = 0;
  for (const m of masked.matchAll(/\s+and\s+/gi)) { out.push(text.slice(at, m.index)); at = m.index + m[0].length; }
  out.push(text.slice(at));
  return out.filter(Boolean);
}

// An item's name alone: "Product Configured (price: 10) ×2" → "Product Configured"
const bareName = piece => piece.replace(TIMES, '').replace(/\(([^()]*)\)\s*$/, '').replace(TIMES, '').trim();

// The longest known names the pieces make, as groups of pieces joined back with "and" ("Search and Filter Applied" before "Search" + "Filter Applied");
// null when they do not all resolve
function groupsOf(pieces, known) {
  for (let end = pieces.length; end > 0; end--) {
    const group = pieces.slice(0, end);
    if (!known.has(key(group.map(bareName).join(' and ')))) continue;
    const more = end === pieces.length ? [] : groupsOf(pieces.slice(end), known);
    if (more) return [group.join(' and '), ...more];
  }
  return null;
}

// One piece of a list: "Product Configured (price: 10) ×2" → one item per repeat
function itemsOf(piece) {
  let rest = piece.trim(), times = 1, counted = false;
  const count = () => { const m = rest.match(TIMES); if (m) { times = Math.min(Math.max(+m[1], 1), 20); rest = rest.slice(0, m.index).trim(); counted = true; } };
  count();
  const brackets = rest.match(/\(([^()]*)\)\s*$/), values = brackets ? valuesOf(brackets[1]) : {};
  if (brackets) rest = rest.slice(0, brackets.index).trim();
  if (!counted) count();
  if (!titleCase(rest)) return [];
  return Array.from({ length: times }, () => ({ name: titleCase(rest), values: { ...values } }));
}
// known (a Set of lower-case names) lets " and " split a part
const listOf = (text, known) => (NOTHING.test(text.trim()) ? [] : topSplit(text).flatMap(part => (known ? groupsOf(andSplit(part), known) || [part] : [part]).flatMap(itemsOf)));

// The scenario as written: { name, mustHave, given: [{ name, values }], when: { name, values } | null,
// then: { kind: 'events', items } | { kind: 'rejected' | 'nothing', reason } | null, problems: [line] }.
// known: the lower-case names of the events and views there are (for " and "); kind: 'command' | 'readModel' (what its frame makes).
export function readScenario(text, known, kind = 'command') {
  const { name, mustHave, rows } = scenarioLines(text);
  const read = { name, mustHave, given: [], when: null, then: null, problems: [] }, problem = p => read.problems.push(p);
  for (const { kw, continues, text: line } of rows) {
    if (!kw) { problem(`Not read: ${line}`); continue; }
    if (kw === 'given') read.given.push(...listOf(line, known));
    else if (kw === 'when') {
      const query = kind === 'readModel' && !continues && line.match(/^query\b\s*\(?(.*?)\)?\s*$/i);
      if (query) { if (read.when) problem('A scenario has one When: the query is left out'); else read.when = { query: query[1].trim() }; continue; }
      const [command, ...more] = itemsOf(line);
      if (continues || more.length) problem(`A scenario has one When: ${(continues ? command : more[0])?.name ?? line} is left out`);
      else if (kind !== 'command') problem(`A view has no When: ${command?.name ?? line} is left out`);
      else if (read.when) problem(`A scenario has one When: ${command?.name ?? line} is left out`);
      else if (command) read.when = command;
    } else {
      const refusal = !continues && line.match(REFUSAL), outcome = !continues && (refusal ? ['', 'rejected', refusal[1]] : line.match(OUTCOME)), bullet = BULLET.test(line), empty = line.match(/^[-•*]?\s*\(empty\)$/i);
      if (bullet || empty) {
        if (kind === 'command') problem(`Not read: ${line}`);
        else read.then = { kind: 'events', items: [], ...read.then, rows: [...(read.then?.rows || []), ...(empty ? [] : [valuesOf(line.replace(/^[-•*]\s*/, ''))])] };
      } else if (outcome) {
        const [, word, reason] = outcome;
        if (!reason.trim()) problem(`Then ${word.toLowerCase()}: needs its reason`);
        else if (kind !== 'command') problem(word.toLowerCase() === 'rejected' ? 'A view has no rejection' : 'A view has no "nothing" outcome');
        else if (read.then) problem('A scenario has one Then outcome');
        else read.then = { kind: word.toLowerCase(), reason: reason.trim() };
      } else if (read.then && read.then.kind !== 'events') problem(`Not read: ${line}`);
      else {
        const items = listOf(line, known);
        if (items.length) read.then = { ...read.then, kind: 'events', items: [...(read.then?.items || []), ...items] };
      }
    }
  }
  if (read.then?.kind === 'events' && read.then.items.length > 1) problem('Only the first Then event is kept');
  return read;
}

const withoutStorage = name => storageMarker(name).name; // feature: stored-elsewhere

// The names the Pad and the book know, lower case: events and views for " and ", commands for When
export function namesKnown(state) {
  const names = { events: new Set(), views: new Set(), commands: new Set(), padCommands: new Set() };
  const set = { event: names.events, readModel: names.views, command: names.commands };
  Object.values(state.elements).forEach(e => set[e.type]?.add(key(e.name)));
  Object.values(state.pad?.notes || {}).forEach(n => {
    const kind = { orange: 'event', green: 'readModel' }[n.colour], name = n.colour === 'orange' ? withoutStorage(externalName(lines(n.text)[0]).name) : lines(n.text)[0]; // feature: stored-elsewhere
    if (kind && name) set[kind].add(key(name));
    if (n.colour === 'blue' && name) names.padCommands.add(key(name));   // the blue notes: only an automation's → looks for them (a When keeps to the board's commands)
  });
  return { ...names, all: new Set([...names.events, ...names.views]) };
}

const valuesText = values => (Object.keys(values).length ? ` (${Object.entries(values).map(([k, v]) => `${k}: ${v}`).join(', ')})` : '');

// What Make chapter and Update chapter do with a scenario note of a frame: `scenario` is what add_scenarios would be given,
// `rows` how it was read (G / W / T, one event to a row) and `warnings` the names that are nowhere (and what could not be read).
// own: { command, view } the names of the frame's own command or view.
export function previewScenario(text, names, kind, own) {
  const read = readScenario(text, names.all, kind), warnings = [...read.problems], x = { name: read.name, given: read.given.map(g => ({ event: g.name, values: g.values })) };
  const rows = [], row = (label, t) => rows.push({ label, text: t });
  if (read.mustHave) x.mustHave = true;
  read.given.forEach((g, i) => {
    row(i ? '' : 'G', `${g.name}${valuesText(g.values)}`);
    if (!names.events.has(key(g.name))) warnings.push(`Unknown event ${g.name}`);
  });
  if (read.when?.query) {
    x.when = { query: read.when.query };
    row('W', `query (${read.when.query})`);
  } else if (read.when) {
    const known = key(read.when.name) === key(own.command || '') || names.commands.has(key(read.when.name));
    x.when = { values: read.when.values, ...(known && key(read.when.name) !== key(own.command || '') ? { command: read.when.name } : {}) };
    row('W', `${read.when.name}${valuesText(read.when.values)}`);
    if (!known) warnings.push(`Unknown command ${read.when.name} (the slice's command is used)`);
  }
  const then = read.then;
  if (then?.kind === 'events' && !then.items.length) {                    // a view's rows with no view named: the frame's view
    x.then = { rows: then.rows };
    then.rows.length ? then.rows.forEach(r => row('', `- ${Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(', ')}`)) : row('T', '(empty)');
  } else if (then?.kind === 'events') {
    const [item] = then.items, view = kind === 'readModel';
    x.then = view ? { values: item.values, ...(then.rows ? { rows: then.rows } : {}) } : { event: item.name, values: item.values };
    if (view && (names.views.has(key(item.name)) || key(item.name) === key(own.view || ''))) x.then.readModel = item.name;
    then.items.forEach((t, i) => row(i ? '' : 'T', `${t.name}${valuesText(t.values)}`));
    if (then.rows) then.rows.length ? then.rows.forEach(r => row('', `- ${Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(', ')}`)) : row('', '(empty)');
    const known = (view ? names.views : names.events).has(key(item.name)) || (view && key(item.name) === key(own.view || ''));
    if (!known) warnings.push(`Unknown ${view ? 'view' : 'event'} ${item.name}`);
  } else if (then) {
    x.then = { [then.kind]: then.reason };
    row('T', `${then.kind}: ${then.reason}`);
  }
  return { name: read.name, scenario: x, rows, warnings };
}
