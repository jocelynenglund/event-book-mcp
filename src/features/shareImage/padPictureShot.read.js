// ===========================================
// SHARE IMAGE - Pad Picture Shot (SV: Pad Picture Shot)
// Exactly what the "Picture of the Pad" draws: the whole Pad, or only some notes and frames, cut to a box round them with a margin,
// as the Pad draws them (note colours, titles and bodies, a scenario's G / W / T, a screen's window, frames with their names, 🔗 counts and,
// when asked, the chapter a frame was made into). Everything is placed from the picture's own top left; the renderer (padImage.js) draws
// from this shot alone. Its own view: the Pad screen draws from Pad Notes and Pad Frames, which this one only borrows what they say.
//   selection: { noteIds, frameIds } of the notes and frames to draw, or null for the whole Pad. A selected frame brings the notes inside it;
//   a selected note does not bring its frame.
//   options: { showMade }
// -> { empty, title, subtitle, credit, width, height, crop: { x, y, w, h } (the box in the Pad's own units, margin included), frames, notes }
// ===========================================

import { padNotes } from '../pad/padNotes.read.js';
import { padFrames } from '../pad/padFrames.read.js';
import { notesInFrame, NOTE_SIZE, SCREEN_WIDTH, ARROW_HEIGHT } from '../pad/sketch.js';

export const MARGIN = 48;                       // paper round what is drawn
export const HEAD = 96;                         // the book's name and what the picture shows, above
export const FOOT = 52;                         // the credit, below
export const MIN_WIDTH = 640;                   // room for the title and the credit
export const SCENARIO_WIDTH = 164;              // a scenario note is narrower (styles.css)
// A screen note is as tall as its window: a title bar, then each line (a read model's box is taller, with its fields taller still)
export const WIRE = { bar: 22, pad: 9, line: 22, readModel: 30, readModelFields: 44, gap: 6, min: 150 };

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function screenHeight(lines) {
  const body = lines.map(parts => {
    const rm = parts.find(p => p.type === 'readModel');
    return rm ? (rm.fields.length ? WIRE.readModelFields : WIRE.readModel) : WIRE.line;
  }).reduce((sum, h) => sum + h + WIRE.gap, 0);
  return Math.max(WIRE.min, WIRE.bar + WIRE.pad * 2 + body);
}

// a note is as tall as its text needs (padNoteHeight.rules.js), never under NOTE_SIZE
const sizeOf = n => (n.colour === 'arrow' ? { w: n.w, h: ARROW_HEIGHT } : n.screen ? { w: SCREEN_WIDTH, h: screenHeight(n.screen.lines) } : { w: n.colour === 'scenario' ? SCENARIO_WIDTH : NOTE_SIZE, h: n.h });

export function padPictureShot(state, { selection = null, options = {} } = {}) {
  const pad = state.pad || { notes: {}, frames: {} };
  const frames = padFrames(state, { editable: false }).frames, notes = padNotes(state, { editable: false }).notes;
  const pickedFrames = selection ? frames.filter(f => selection.frameIds?.includes(f.frameId)) : frames;
  const inside = new Set(pickedFrames.flatMap(f => notesInFrame(pad, pad.frames[f.frameId], true).map(n => n.id)));
  const pickedNotes = (selection ? notes.filter(n => selection.noteIds?.includes(n.noteId) || inside.has(n.noteId)) : notes).map(n => ({ ...n, ...sizeOf(n) }));
  const title = state.modelName || 'Event Book', credit = 'Made with Event Book';
  if (!pickedNotes.length && !pickedFrames.length) return { empty: true, title, subtitle: 'Nothing on the Pad yet', credit, width: MIN_WIDTH, height: HEAD + 2 * MARGIN + FOOT, crop: null, frames: [], notes: [] };

  const boxes = [...pickedNotes.map(n => ({ x: n.x, y: n.y, w: n.w, h: n.h })), ...pickedFrames.map(f => ({ x: f.x, y: f.y, w: f.w, h: f.drawnH }))];
  const x0 = Math.min(...boxes.map(b => b.x)), y0 = Math.min(...boxes.map(b => b.y));
  const w = Math.max(...boxes.map(b => b.x + b.w)) - x0, h = Math.max(...boxes.map(b => b.y + b.h)) - y0;
  const width = Math.max(MIN_WIDTH, w + 2 * MARGIN), height = HEAD + h + 2 * MARGIN + FOOT;
  const left = MARGIN + (width - 2 * MARGIN - w) / 2, top = HEAD + MARGIN, place = o => ({ ...o, x: o.x - x0 + left, y: o.y - y0 + top });
  const subtitle = ['Pad', selection ? 'a selection' : null, [pickedNotes.length && plural(pickedNotes.length, 'note', 'notes'), pickedFrames.length && plural(pickedFrames.length, 'frame', 'frames')].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  return {
    empty: false, title, subtitle, credit, width, height, crop: { x: x0 - MARGIN, y: y0 - MARGIN, w: w + 2 * MARGIN, h: h + 2 * MARGIN },
    frames: pickedFrames.map(f => place({ x: f.x, y: f.y, w: f.w, h: f.drawnH, name: f.shownName, nameIsDefault: f.nameIsDefault, noteCount: f.noteCount, made: options.showMade && f.chip ? f.chip.label : null })),
    notes: pickedNotes.map(n => place({ x: n.x, y: n.y, w: n.w, h: n.h, colour: n.colour, kind: n.kind, title: n.title, bodyLines: n.bodyLines, size: n.size, places: n.places, scenario: n.scenario, screen: n.screen, automation: n.automation ?? null }))
  };
}
