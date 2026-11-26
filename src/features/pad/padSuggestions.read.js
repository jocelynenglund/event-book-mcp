// ===========================================
// PAD - Suggestions (SV: Pad Suggestions)
// The names offered while a note (or the ＋ Events list) is being typed: what the caret is naming (padSuggest.rules.js), matched against the
// book's events, commands and read models: its stickies and the Pad's blue, orange and green notes (Title Case, as Make chapter reads them).
// Names of the frame the note is in come first. The note being typed is never offered to itself. Escape dismisses (`dismissed`), and `active`
// (the one the arrow keys are on) is this device's.
//   colour: the note's, or 'bulk' for the ＋ Events box.  text, caret: what is typed.  noteId: the note being edited (or `at` {x, y}: a new one).
// -> { visible, kind, from, to, query, active, items: [{ index, name, kind, insert, inFrame }] }
// ===========================================

import { contextAt, rank } from './padSuggest.rules.js';
import { notesInFrame, NOTE_SIZE } from './sketch.js';
import { parseNote, titleCase } from './padNote.rules.js';

const KIND_OF_COLOUR = { blue: 'command', orange: 'event', green: 'readModel' };
import { pageSuggestions } from '../pages/pagesSuggest.js'; // feature: pages

// Other features' names to offer, by the kind a context (padSuggest.rules.js screenContexts) asks for: { label, names(state, { text, caret, noteId }) → [name] }
const suggestionKinds = {
  page: { label: 'page', names: pageSuggestions }, // feature: pages
};
const KIND_LABEL = { command: 'command', event: 'event', readModel: 'view' };
const NONE = { visible: false, kind: null, from: 0, to: 0, query: '', active: null, items: [] };

// Every name the book and the Pad have, by kind: { command|event|readModel: Map(lower name → { name, noteId | null, fields }) }
function namesOf(state, exceptNoteId) {
  const names = { command: new Map(), event: new Map(), readModel: new Map() };
  const add = (kind, name, noteId, fields) => {
    const key = name.toLowerCase(), have = names[kind].get(key);
    names[kind].set(key, { name, noteIds: [...(have?.noteIds || []), ...(noteId ? [noteId] : [])], fields: [...new Set([...(have?.fields || []), ...fields])] });
  };
  Object.values(state.elements).forEach(e => names[e.type] && e.name.trim() && add(e.type, titleCase(e.name), null, (e.properties || []).map(p => p.name)));
  Object.values(state.pad?.notes || {}).forEach(n => {
    const kind = KIND_OF_COLOUR[n.colour], parsed = kind && parseNote(n.text, n.colour);
    if (parsed?.name && n.id !== exceptNoteId) add(kind, parsed.name, n.id, parsed.fields.map(f => f.name));
  });
  return names;
}

// The frame the note is in (its middle inside it): the notes there come first, and a frame with a green note and no blue one is a view's
function frameOf(state, noteId, at) {
  const pad = state.pad || { notes: {}, frames: {} }, own = pad.notes[noteId], x = (own?.x ?? at?.x ?? 0) + NOTE_SIZE / 2, y = (own?.y ?? at?.y ?? 0) + NOTE_SIZE / 2;
  const frame = Object.values(pad.frames).filter(f => x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h).sort((a, b) => a.w * a.h - b.w * b.h)[0];
  const inside = frame ? notesInFrame(pad, frame).filter(n => n.id !== noteId) : [];
  return { ids: new Set(inside.map(n => n.id)), view: inside.some(n => n.colour === 'green') && !inside.some(n => n.colour === 'blue') };
}

export function padSuggestions(state, { colour, text = '', caret = text.length, noteId = null, at = null, active = null, dismissed = false } = {}) {
  if (dismissed) return NONE;
  const frame = frameOf(state, noteId, at), ctx = contextAt(text, caret, colour, { viewFrame: frame.view });
  if (!ctx) return NONE;
  const names = namesOf(state, noteId), pools = { event: ['event'], command: ['command'], readModel: ['readModel'], commandOrEvent: ['command', 'event'], eventOrReadModel: ['event', 'readModel'] };
  let candidates;
  if (suggestionKinds[ctx.kind]) {
    candidates = suggestionKinds[ctx.kind].names(state, { text, caret, noteId }).map(name => ({ name, kind: ctx.kind, insert: name, inFrame: false }));
  } else if (ctx.kind === 'field') {
    const of = ['event', 'command', 'readModel'].map(k => names[k].get(titleCase(ctx.of).toLowerCase())).find(Boolean);
    const used = new Set([...(text.slice(0, caret).slice(text.lastIndexOf('\n', caret - 1) + 1).match(/[\p{L}\p{N}_]+(?=\s*:)/gu) || []), ...(ctx.used || [])]);
    candidates = (of?.fields || []).filter(f => !used.has(f)).map(f => ({ name: f, kind: 'field', insert: `${f}: `, inFrame: false }));
  } else {
    candidates = (pools[ctx.kind] || []).flatMap(kind => [...names[kind].values()].map(v => ({ name: v.name, kind, insert: v.name, inFrame: v.noteIds.some(id => frame.ids.has(id)) })));
    candidates.push(...ctx.literals.map(l => ({ name: l.trim(), kind: 'literal', insert: l, inFrame: false })));
  }
  const items = rank(candidates, ctx.query).map((c, index) => ({ index, name: c.name, kind: c.kind, label: KIND_LABEL[c.kind] || suggestionKinds[c.kind]?.label || (c.kind === 'field' ? 'field' : ''), insert: c.insert, inFrame: c.inFrame }));
  if (!items.length) return NONE;
  return { visible: true, kind: ctx.kind, from: ctx.from, to: ctx.to, query: ctx.query, active: active != null && active < items.length ? active : null, items };
}
