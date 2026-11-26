// ===========================================
// PAD - What a screen note says, read leniently (SV: Pad Screen Text)
// A screen note (white window card) is a low-fi sketch typed as text. One screen in event modeling is ONE screen that appears in several
// slices: its inputs feed commands, and it displays read models, so the note says both:
//   Basket                         the first line is the screen's name
//   { Product List }               an area showing that whole read model;  { Product List: sku, name }  lists the fields shown
//   [ Selected ] ( Add )           [ Field ] is an input (camelCased field name), ( Label ) a button that sends a command
//   Your items                     any other line is plain text, drawn as typed
// Several parts can share a line. A bracket with nothing in it is just text. A button is matched to a command by its name: the same name,
// else a command whose name has the label as whole words ("Add" → "Add Product"); a tie matches none and says so. Nothing here refuses:
// what can not be placed is a warning, never dropped without a word. One reader serves the drawing, Make chapter, Update chapter and
// the completeness checks.
// ===========================================

import { titleCase, camelCase } from './padNote.rules.js';

const PART = /\{([^{}]*)\}|\[([^[\]]*)\]|\(([^()]*)\)/g;
const lines = text => String(text ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
const same = (a, b) => titleCase(a).toLowerCase() === titleCase(b).toLowerCase();

// "Product List: sku, Unit price" → { name: 'Product List', fields: ['sku', 'unitPrice'], whole: false }
function readModelOf(inside) {
  const colon = inside.indexOf(':'), name = titleCase(colon < 0 ? inside : inside.slice(0, colon));
  const fields = colon < 0 ? [] : inside.slice(colon + 1).split(',').map(camelCase).filter(Boolean);
  return name ? { type: 'readModel', name, fields, whole: !fields.length } : null;
}

// One line as its parts, in the order typed (the text between them as text)
function partsOf(line) {
  const parts = [];
  let text = '', at = 0;
  const flush = () => { if (text.trim()) parts.push({ type: 'text', text: text.trim() }); text = ''; };
  for (const m of line.matchAll(PART)) {
    const part = m[1] !== undefined ? readModelOf(m[1])
      : m[2] !== undefined ? (camelCase(m[2]) ? { type: 'input', field: camelCase(m[2]), label: m[2].trim() } : null)
      : m[3].trim() ? { type: 'button', label: m[3].trim() } : null;
    text += line.slice(at, m.index) + (part ? '' : m[0]);
    at = m.index + m[0].length;
    if (part) { flush(); parts.push(part); }
  }
  text += line.slice(at);
  flush();
  return parts;
}

// -> { title: as typed, name: Title Case, lines: [{ parts }], readModels: [{ name, fields, whole }], inputs: [{ field, label, line }], buttons: [{ label, line }] }
// (line: the index in `lines` the part is on; a read model, input or button written twice is one)
export function parseScreen(text) {
  const [first = '', ...rest] = lines(text);
  const out = { title: first, name: titleCase(first), lines: rest.map(l => ({ parts: partsOf(l) })), readModels: [], inputs: [], buttons: [] };
  out.lines.forEach(({ parts }, line) => parts.forEach(p => {
    if (p.type === 'readModel') {
      const have = out.readModels.find(r => same(r.name, p.name));
      if (!have) out.readModels.push({ name: p.name, fields: [...p.fields], whole: p.whole });
      else { have.fields.push(...p.fields.filter(f => !have.fields.includes(f))); have.whole ||= p.whole; }
    } else if (p.type === 'input' && !out.inputs.some(i => i.field === p.field)) out.inputs.push({ field: p.field, label: p.label, line });
    else if (p.type === 'button' && !out.buttons.some(b => b.label.toLowerCase() === p.label.toLowerCase())) out.buttons.push({ label: p.label, line });
  }));
  return out;
}

const wordsOf = s => titleCase(s).toLowerCase().split(' ').filter(Boolean);
const listed = names => (names.length > 2 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names.join(' and '));

// The commands a button could mean: those of the same name, else those whose name has the label as whole words in a row
export function fitting(label, commandNames) {
  const names = [...new Map(commandNames.filter(Boolean).map(n => [n.trim().toLowerCase(), n.trim()])).values()];
  const exact = names.filter(n => same(n, label)), want = wordsOf(label).join(' ');
  return exact.length ? exact : names.filter(n => want && ` ${wordsOf(n).join(' ')} `.includes(` ${want} `));
}

// The command a button sends: the one that fits it, when there is only one.
// -> { command: name | null, warning: why it is none | null }
export function matchButton(label, commandNames) {
  const hits = fitting(label, commandNames);
  if (hits.length === 1) return { command: hits[0], warning: null };
  return { command: null, warning: hits.length ? `${label} fits ${listed(hits)}: name the button after one` : `No command called ${label}` };
}

// The inputs of a screen (parseScreen's) that go to this command: all but the ones on a line whose button sends another command (buttons matched among commandNames)
export function inputsForCommand(screen, command, commandNames) {
  const sent = screen.buttons.map(b => ({ line: b.line, command: matchButton(b.label, commandNames).command }));
  return screen.inputs.filter(i => {
    const sends = sent.filter(b => b.line === i.line && b.command).map(b => b.command.toLowerCase());
    return !sends.length || sends.includes(String(command).toLowerCase());
  });
}

// The sketch with the buttons labelled `label` (any case) relabelled `to`, the rest as typed
export const relabelButton = (text, label, to) => String(text ?? '').replace(/\(([^()]*)\)/g, (all, inside) => (inside.trim().toLowerCase() === String(label).trim().toLowerCase() ? `( ${to} )` : all));

// The screen as the drawing needs it: { title, empty, lines: [[part]] } where each part has `dim`. Seen from a slice (focus: { commands, readModels,
// candidates? } by name, `candidates` being the commands a button may mean, the slice's own by default) what the slice is about is lit and
// the rest dim: in a command slice its inputs and the button that sends its command (the read models dim), in a view slice that read model
// (the inputs, buttons and other read models dim). Plain text is never dim. With no focus, or a slice with neither, nothing is.
export function wireframe(text, focus = null) {
  const screen = parseScreen(text), commands = focus?.commands || [], views = focus?.readModels || [];
  const sends = label => { const { command } = matchButton(label, focus?.candidates || commands); return !!command && commands.some(c => same(c, command)); };
  const dimmed = p => {
    if (commands.length) return p.type === 'readModel' || (p.type === 'button' && !sends(p.label));
    if (views.length) return p.type === 'input' || p.type === 'button' || (p.type === 'readModel' && !views.some(v => same(v, p.name)));
    return false;
  };
  return { title: screen.title, empty: !screen.title && !screen.lines.length, lines: screen.lines.map(l => l.parts.map(p => ({ ...p, dim: dimmed(p) }))) };
}
