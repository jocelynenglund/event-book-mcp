// ===========================================
// PAD - What copy, cut and paste carry (SV: Pad Clipboard Copy, Pad Paste Plan, Pad Paste Text)
// Copy takes the selected notes and frames (a frame brings the notes inside it); paste makes INDEPENDENT ones: new ids, the same
// colour, text, name and size, the same layout relative to each other. A linked copy is copied as the plain note it shows; a frame
// that was made into a chapter is pasted as a new, unmade frame (only its name and size travel). Plain text from elsewhere becomes
// notes, one per paragraph. Nothing here refuses; ids come from the caller.
// ===========================================

import { notesInFrame, NOTE_SIZE, NOTE_GAP } from './sketch.js';

export const CLIPBOARD_MIME = 'application/x-eventbook-pad+json';
export const PASTE_STEP = 24;       // with no pointer to paste at: this far from the originals, and again for each paste after

const byPlace = (a, b) => a.y - b.y || a.x - b.x;

// { notes: [{ x, y, colour, text }], frames: [{ x, y, w, h, name }] } for the selection; null when nothing is selected
export function copyOf(pad, { noteIds = [], frameIds = [] }) {
  const frames = frameIds.map(id => pad.frames[id]).filter(Boolean);
  const chosen = new Map(noteIds.filter(id => pad.notes[id]).map(id => [id, pad.notes[id]]));
  frames.forEach(f => notesInFrame(pad, f, true).forEach(n => chosen.set(n.id, n)));
  if (!chosen.size && !frames.length) return null;
  return {
    notes: [...chosen.values()].map(n => ({ x: n.x, y: n.y, colour: n.colour, text: n.text, ...(n.colour === 'arrow' ? { w: n.w } : {}) })).sort(byPlace),
    frames: frames.map(f => ({ x: f.x, y: f.y, w: f.w, h: f.h, name: f.name })).sort(byPlace)
  };
}

// What other programs get: the notes' text, a blank line between (the frames' names when there are no notes)
export const textOf = copy => (copy.notes.length ? copy.notes.map(n => n.text) : copy.frames.map(f => f.name)).map(t => String(t).trim()).filter(Boolean).join('\n\n');

// A payload read back from the clipboard (a string, or an object): the copy, or null when it is not one
export function payloadOf(raw) {
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!p || !Array.isArray(p.notes) || !Array.isArray(p.frames)) return null;
    const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
    const notes = p.notes.map(n => ({ x: num(n.x), y: num(n.y), colour: String(n.colour || 'blue'), text: String(n.text ?? ''), ...(n.colour === 'arrow' && n.w ? { w: num(n.w) } : {}) }));
    const frames = p.frames.map(f => ({ x: num(f.x), y: num(f.y), w: num(f.w), h: num(f.h), name: String(f.name ?? '') }));
    return notes.length || frames.length ? { notes, frames } : null;
  } catch { return null; }
}

// What a paste adds: { notes: [{ noteId, x, y, colour, text }], frames: [{ frameId, x, y, w, h, name }] }. The group's top-left goes at
// `at` (the pointer over the canvas) when it is known, else `step` times PASTE_STEP right and down from where it was.
// ids: { note(), frame() }
export function pastePlan(copy, { at = null, step = 1, ids }) {
  const xs = [...copy.notes.map(n => n.x), ...copy.frames.map(f => f.x)], ys = [...copy.notes.map(n => n.y), ...copy.frames.map(f => f.y)];
  const left = Math.min(...xs), top = Math.min(...ys);
  const dx = at ? Math.round(at.x) - left : PASTE_STEP * step, dy = at ? Math.round(at.y) - top : PASTE_STEP * step;
  return {
    frames: copy.frames.map(f => ({ frameId: ids.frame(), x: f.x + dx, y: f.y + dy, w: f.w, h: f.h, name: f.name })),
    notes: copy.notes.map(n => ({ noteId: ids.note(), x: n.x + dx, y: n.y + dy, colour: n.colour, text: n.text, ...(n.w ? { w: n.w } : {}) }))
  };
}

// An event name reads like one: two to six words, no sentence punctuation, ending in a past tense ("Order Placed", "Payment sent")
const IRREGULAR = new Set(['sent', 'paid', 'made', 'taken', 'given', 'chosen', 'done', 'bought', 'built', 'left', 'lost', 'won', 'begun', 'held', 'kept', 'told', 'sold', 'found', 'seen', 'written', 'broken']);
export function looksLikeEvent(firstLine) {
  const line = String(firstLine ?? '').replace(/\s*\(external\)\s*$/i, '').trim();
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6 || /[.?!,:;]/.test(line)) return false;
  const last = words[words.length - 1].toLowerCase();
  return /ed$/.test(last) || IRREGULAR.has(last);
}

// Plain text pasted from elsewhere: one note per paragraph (blank-line separated), in a row from `at` (the pointer); orange when its
// first line looks like an event name, else white. -> [{ noteId, x, y, colour, text }]
export function textPlan(text, { at, ids }) {
  const paragraphs = String(text ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const step = NOTE_SIZE + NOTE_GAP;
  return paragraphs.map((p, i) => ({
    noteId: ids.note(), x: Math.round(at.x) + i * step, y: Math.round(at.y),
    colour: looksLikeEvent(p.split('\n')[0]) ? 'orange' : 'white', text: p
  }));
}
