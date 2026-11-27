// ===========================================
// SCREEN SELECT - What a screen's field says it is (pure)
// A screen's field can pick from a list, be hidden, or say it is required. In a screen's text (pad/padScreen.rules.js) and as a field
// in the plan, the agent tools and the plain-text model file:
//   - guests []{Guest List}      pick many from the view "Guest List" (also [ guests ]{Guest List})
//   - size (){Sizes}             pick one from the view "Sizes" (also ( size ){Sizes}); a ( Button ) with no {…} right after it stays a button
//   - <requestId>                hidden: the screen carries it into the command, the person does not see or type it
//   - email*  /  [ email* ]      required;   note?  /  [ note? ]   optional
// What it stores: ScreenFieldSet on the screen's field (select, optionsFrom, hidden, required). Nothing here refuses.
// ===========================================

import { camelCase, titleCase } from '../pad/padNote.rules.js';
export { isScreenField, screenFieldLabel, requiredHint } from './screenSelect.label.js';

const BULLET = /^\s*(?:[-•·–—]\s*|\*\s+)/;
const SELECT_LINE = /^([^[\](){}<>]+?)\s*(\[\s*\]|\(\s*\))\{([^{}]*)\}\s*$/;
const HIDDEN_LINE = /^<([^<>]+)>\s*(?:\[\s*\]|\(\s*\))?\s*(?:\{[^{}]*\})?\s*$/;
const MARKED_LINE = /^([^[\](){}<>:*?]+[*?])\s*$/;

// "email*" → { text: 'email', required: true }, "note?" → { text: 'note', required: false }, anything else is as it is
export function markOf(text) {
  const m = String(text ?? '').trim().match(/^(.*?)\s*([*?])$/);
  return m && m[1].trim() ? { text: m[1].trim(), required: m[2] === '*' } : { text: String(text ?? '').trim(), required: undefined };
}

const viewName = inside => titleCase(String(inside ?? '').split(':')[0]);
const withRequired = (part, required) => (required === undefined ? part : { ...part, required });

// An [ input ] (or what is inside the brackets of a select): { type: 'input', field, label, required? } or null when it names no field
export function inputPart(inside) {
  const { text, required } = markOf(inside);
  return camelCase(text) ? withRequired({ type: 'input', field: camelCase(text), label: text }, required) : null;
}

// [ guests ]{View} (many) or ( size ){View} (one): { type: 'select', field, label, select, from, required? }
export function selectPart(inside, view, select) {
  const { text, required } = markOf(inside), from = viewName(view);
  return camelCase(text) && from ? withRequired({ type: 'select', field: camelCase(text), label: text, select, from }, required) : null;
}

// <requestId>: { type: 'hidden', field, label }
export const hiddenPart = inside => (camelCase(inside) ? { type: 'hidden', field: camelCase(inside), label: String(inside).trim() } : null);

// A whole line that is one field: "- guests []{Guest List}", "size (){Sizes}", "- <requestId>", "- email*", "- note?" → the part, or null
// (a plain line with no bullet and no mark stays text)
export function fieldLine(line) {
  const bulleted = BULLET.test(line), bare = String(line ?? '').replace(BULLET, '').trim();
  const hidden = bare.match(HIDDEN_LINE);
  if (hidden) return hiddenPart(hidden[1]);
  const select = bare.match(SELECT_LINE);
  if (select) return selectPart(select[1], select[3], select[2].startsWith('[') ? 'many' : 'one');
  const marked = bulleted && bare.match(MARKED_LINE);
  return marked ? inputPart(marked[1]) : null;
}

// What an input part adds to the screen's inputs (parseScreen)
export const inputExtras = p => ({
  ...(p.type === 'select' ? { select: p.select, from: p.from } : {}), ...(p.type === 'hidden' ? { hidden: true } : {}),
  ...(p.required !== undefined ? { required: p.required } : {})
});

// A field as the text of a field list says it: "guests []{Guest List}", "size (){Sizes}", "<requestId>", "email*", "note?"; null for a plain name (not one of ours)
// -> { name, select?, from?, hidden?, required? }
export function screenFieldOf(entry) {
  const part = fieldLine(`- ${String(entry ?? '').trim()}`);
  return part ? { name: part.field, ...inputExtras(part) } : null;
}

// A stored field as it is written in a field list (the inverse of screenFieldOf): "guests []{Guest List}", "<requestId>", "email*"
export function screenFieldText(p) {
  if (!p) return '';
  const mark = p.required === true ? '*' : p.required === false ? '?' : '';
  if (p.hidden) return `<${p.name}>`;
  if (p.select) return `${p.name}${mark} ${p.select === 'many' ? '[]' : '()'}{${p.optionsFrom}}`;
  return `${p.name}${mark}`;
}

const key = s => titleCase(s).toLowerCase();
// The view a select takes its options from: exact name first, then letter case and spacing ignored. -> the read model's element or undefined
export function optionsView(state, from) {
  const views = Object.values(state.elements || {}).filter(e => e.type === 'readModel' && !e.orphaned);
  return views.find(v => v.name === from) || views.find(v => key(v.name) === key(from));
}
