// ===========================================
// FIELD SOURCES - Tidy: fields written as prose
// "pages[] (pageId, finishedAt)" typed as one field gets split on its commas into "pages[] (pageId" and
// "finishedAt)"; "status (open | closed)" is a name with its choices in brackets. Neither is a field name, so the
// completeness check cannot say where it comes from. This reads such fields back into names:
//   pages[] (pageId, finishedAt)  →  a list field `pages[]` with the item fields pageId, finishedAt
//   status (open | closed)        →  `status` (a field has no description, so the choices are not kept)
//   finishedAt)                   →  `finishedAt` (an orphan end of a split field), or gone when the sticky has it
// Pure: from a sticky's properties to groups of properties and what each becomes.
// ===========================================

import { fieldKey, splitArrayName } from '../../core/constants.js';

// A name, not prose
export const isPlainName = name => !/[():|{}]/.test(name);

const ident = /^[A-Za-z_][\w.\-]*$/;
const depthOf = s => [...s].reduce((d, ch) => d + ('({'.includes(ch) ? 1 : ')}'.includes(ch) ? -1 : 0), 0);

// One field's text read back: { name, type, items, dropped } (name null when nothing in it can be a name)
function readBack(text, typeOf) {
  const cut = text.search(/[({:|]/);
  const head = (cut < 0 ? text : text.slice(0, cut)).replace(/[)}\s]+$/, '').replace(/^[)}\s]+/, '').trim();
  const tail = cut < 0 ? '' : text.slice(cut).replace(/^[({:|]\s*/, '').replace(/[)}\s]+$/, '').trim();
  const { name, array } = splitArrayName(head);
  if (!ident.test(name)) return { name: null, dropped: text };
  const names = tail.split(',').map(s => s.trim());
  const items = array && tail && names.every(s => ident.test(s)) ? names : null;
  return { name, type: array ? 'array' : (typeOf === 'array' ? 'string' : typeOf), items, dropped: items || !tail ? '' : tail };
}

// The fields of a sticky that are prose, as groups: [{ ids: [propertyId…], before, name, type, items, dropped, gone }].
// A group is one field as typed: the pieces it was split into, joined again, each opening bracket with a closing one.
// A sticky keeps its fields by name, not in the order they were typed, so a piece that opens "(" is paired with one that
// closes it ")" (the first with the first, when there are several); a piece between them, a plain name, stays a field.
// null when every field is a name. gone: the group adds nothing (the sticky has that field already, or it names nothing).
export function tidyOf(el) {
  const props = el.properties || [];
  const at = p => props.indexOf(p);
  const openers = props.filter(p => depthOf(p.name) > 0);
  const closers = props.filter(p => depthOf(p.name) < 0);
  const whole = props.filter(p => depthOf(p.name) === 0 && !isPlainName(p.name));
  const pieces = [...openers.map((o, i) => (closers[i] ? [o, closers[i]] : [o])), ...closers.slice(openers.length).map(c => [c]), ...whole.map(p => [p])]
    .sort((a, b) => Math.min(...a.map(at)) - Math.min(...b.map(at)));
  if (!pieces.length) return null;
  const used = new Set(pieces.flat());
  const seen = new Set(props.filter(p => !used.has(p)).map(p => fieldKey(p.name)));
  return pieces.map(group => {
    const before = group.map(p => p.name).join(', ');
    const r = readBack(before, group[0].type);
    const key = r.name && fieldKey(r.name);
    const gone = !r.name || seen.has(key);
    if (key) seen.add(key);
    return { ids: group.map(p => p.id), names: group.map(p => p.name), before, ...r, gone };
  });
}

// How a group reads as a field: pages[]{pageId, finishedAt}
export const afterText = g => g.gone ? '' : `${g.name}${g.type === 'array' ? '[]' : ''}${g.items ? `{${g.items.join(', ')}}` : ''}`;

// A group's note: what the tidied field cannot keep
export const noteOf = g => g.gone ? (g.name ? 'the sticky has it already' : 'not a field name: removed')
  : g.dropped ? `the choices "${g.dropped}" are not kept: a field has no description` : '';
