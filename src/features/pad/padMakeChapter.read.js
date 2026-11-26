// ===========================================
// PAD - Make chapter preview (SV: Pad Make Chapter)
// What Make chapter… will build from the selected frames, before anything is: one slice per frame, in the frames' left-to-right
// order, its notes read leniently (padNote.rules.js) in left-to-right order. A frame makes a command slice when it has a blue
// note (the first), else a view slice when it has a green one; its orange notes are its events. Every other blue or green
// note is left out (a slice has one command or one view; `leftOut` lists them per frame, to warn first), and a frame with neither can not make a slice.
// A red note (a hotspot) is a line that Make chapter turns into an open comment on the slice, a white one a line that goes into the slice's
// description; both can be unticked like an event, and neither is ever part of the slice or a reason to leave a note out.
// A screen note (a white window) puts the screen in the slice (padMakeScreens.rules.js): one line "Screen", and its inputs as field lines of the command; the screen also goes into the slices of the views it shows and the commands its buttons send.
// An automation note (lilac) makes an automation slice when the frame has no blue or green note (padAutomation.rules.js): one line "Automation" with what it reads and what it triggers or translates into
// (the frame's orange notes are the events of its command, or what a translator makes), with a warning for every name that is nowhere.
// An event that another command's frame holds as well is listed in `madeTwice` to warn first (padEventMaker.rules.js: one command makes an event).
// A scenario note (warm grey, like the board's Given / When / Then row) is a line of its own, "Scenario": the Given / When / Then it says (padScenario.rules.js), shown as it was read with a warning for every name
// that is nowhere (not on the Pad, not on the board); it can be unticked like an event, and is never part of the slice.
// `shelve` (default on, this device's tick) says the made frames go on the shelf at once.
// Each line is a note's name or one of its field lines; the events' names and the field lines can be unticked (`off` holds the
// keys of the ones that were: "<noteId>:<line>", 0 the name, then each field in order). Renamed slices and chapter: `names`
// (frameId → name) and `chapterName`.
// ===========================================

import { notesInFrame } from './sketch.js';
import { parseNote, oneLine } from './padNote.rules.js';
import { namesKnown, previewScenario } from './padScenario.rules.js';
import { previewAutomation, ownCommand } from './padAutomation.rules.js';
import { addScreens } from './padMakeScreens.rules.js';
import { makersOf } from './padEventMaker.rules.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const ROLE = { command: 'command', readModel: 'view', event: 'event', hotspot: 'hotspot', note: 'note' };
const LABEL = { hotspot: 'Hotspot → comment', note: 'Note → description' };   // what Make chapter does with a line that is not part of the slice

// An automation's one line: what it reads, and the command it triggers or the event it translates into (its stickies are made by the plan-file step: stepOf)
function automationLine(note, auto, off) {
  const it = auto.targetKind === 'event' ? 'translates into event' : 'triggers command';
  const rows = [auto.reads && { label: 'reads', text: auto.reads }, auto.target && { label: '→', text: `${it} ${auto.target}` }].filter(Boolean);
  return { key: `${note.id}:0`, noteId: note.id, role: 'automation', label: 'Automation', text: auto.name, name: auto.name, note: null, included: true, tickable: false, automation: auto, rows, warnings: auto.warnings };
}

function sliceOf(pad, frame, names, off, known) {
  const notes = notesInFrame(pad, frame).map(n => ({ note: n, parsed: parseNote(n.text, n.colour) }));
  // An example note (padNote.rules.js: field lines with values) is not a definition: the slice's own command or view is the first note that is not one
  const first = kind => notes.find(n => n.parsed.kind === kind && !n.parsed.example) || notes.find(n => n.parsed.kind === kind);
  const main = notes.find(n => n.parsed.kind === 'automation') || first('command') || first('readModel');
  let auto = main?.parsed.kind === 'automation' ? previewAutomation(main.note.text, known) : null;
  // The command an automation sends may sit in its frame: it is part of the slice (its fields and the frame's events are the slice's), not left out
  const own = auto ? ownCommand(main.note.text, notes.filter(n => n.parsed.kind === 'command').map(n => ({ name: n.parsed.name, note: n.note }))) : null;
  if (own && !auto.target) auto = { ...auto, target: own.name, targetKind: 'command', warnings: auto.warnings.filter(w => !/^An automation triggers a command/.test(w)) };
  const lines = [], scenarios = [], screens = [];
  for (const { note, parsed } of notes) {
    const isMain = note === main?.note || note === own?.note, isEvent = parsed.kind === 'event';
    const key = `${note.id}:0`;
    if (parsed.kind === 'scenario') {
      const s = main && previewScenario(note.text, known, main.parsed.kind, { command: main.parsed.kind === 'command' ? main.parsed.name : null, view: main.parsed.kind === 'readModel' ? main.parsed.name : null });
      if (s?.name) scenarios.push({ key, noteId: note.id, role: 'scenario', label: 'Scenario', text: s.name, name: s.name, note: null, included: !off.includes(key), tickable: true, scenario: s.scenario, rows: s.rows, warnings: s.warnings });
      continue;
    }
    if (parsed.kind === 'screen') {   // a screen is placed in the slice (padMakeScreens.rules.js reads its text across the frames)
      if (main && parsed.name && !screens.some(l => l.name.toLowerCase() === parsed.name.toLowerCase())) screens.push({ key, noteId: note.id, role: 'screen', label: 'Screen', text: parsed.name, name: parsed.name, note: null, included: !off.includes(key), tickable: true, implied: false, screenText: note.text, rows: [], warnings: [] });
      continue;
    }
    if (LABEL[parsed.kind]) {
      const text = oneLine(note.text);
      if (text) lines.push({ key, noteId: note.id, role: parsed.kind, label: LABEL[parsed.kind], text, name: text, note: null, included: !off.includes(key), tickable: true });
      continue;
    }
    if (note === main?.note && auto) { lines.push(automationLine(note, auto, off)); continue; }
    if (parsed.example && !isMain && !isEvent && main && parsed.name.toLowerCase() === main.parsed.name.toLowerCase()) continue;   // the slice's own command or view, shown again with example values
    if (!isMain && !isEvent) { lines.push({ key, noteId: note.id, role: 'left out', text: parsed.name, name: parsed.name, note: null, included: false, tickable: false }); continue; }
    const included = isMain || !off.includes(key);
    lines.push({ key, noteId: note.id, role: ROLE[parsed.kind], text: parsed.name, name: parsed.name, note: null, included, tickable: isEvent, ...(isEvent && parsed.external ? { external: true } : {}) });
    if (!included) continue;
    parsed.fields.forEach((f, i) => {
      const fieldKey = `${note.id}:${i + 1}`;
      lines.push({ key: fieldKey, noteId: note.id, role: 'field', text: f.note ? `${f.name} (${f.note})` : f.name, name: f.name, note: f.note, ...(f.type ? { type: f.type } : {}), included: !off.includes(fieldKey), tickable: true });
    });
  }
  return {
    frameId: frame.id, name: (names[frame.id] ?? (frame.name.trim() || main?.parsed.name || '')).trim(), kind: main?.parsed.kind || null,
    why: main ? null : 'Needs a blue (command), green (view) or lilac (automation) note', lines: main ? [...lines, ...screens, ...scenarios] : []
  };
}

export function padMakeChapter(state, { frameIds = [], chapterName = null, names = {}, off = [], shelve = true } = {}) {
  const pad = state.pad || { notes: {}, frames: {} };
  const frames = frameIds.map(id => pad.frames[id]).filter(Boolean).sort((a, b) => a.x - b.x || a.y - b.y);
  const known = namesKnown(state), slices = frames.map(f => sliceOf(pad, f, names, off, known));
  const name = (chapterName ?? frames[0]?.name ?? '').trim();
  const made = slices.filter(s => s.kind);
  addScreens(state, made, off);
  const fields = new Set(made.flatMap(s => s.lines.filter(l => l.role === 'field' && l.included).map(l => l.name.toLowerCase())));
  const scenarios = made.flatMap(s => s.lines.filter(l => l.role === 'scenario' && l.included)).length;
  const screens = new Set(made.flatMap(s => s.lines.filter(l => l.role === 'screen' && l.included).map(l => l.name.toLowerCase()))).size;
  return {
    chapterName: name, canMake: !!made.length && !!name, shelve,
    existing: Object.values(state.chapters).some(c => c.name.trim().toLowerCase() === name.toLowerCase() && !!name),
    summary: `${plural(made.length, 'slice', 'slices')}, ${plural(fields.size, 'field', 'fields')}${screens ? `, ${plural(screens, 'screen', 'screens')}` : ''}${scenarios ? `, ${plural(scenarios, 'scenario', 'scenarios')}` : ''}`,
    madeTwice: made.filter(s => s.kind === 'command').flatMap(s => {   // an event one command makes here and another's frame holds too: one command makes an event
      const mine = s.lines.find(l => l.role === 'command').name.toLowerCase();
      return s.lines.filter(l => l.role === 'event' && l.included && !l.external).map(l => ({ slice: s.name, event: l.name, others: makersOf(pad, l.name).map(m => m.command).filter(c => c.toLowerCase() !== mine) })).filter(w => w.others.length);
    }),
    leftOut: slices.map(s => ({ frameId: s.frameId, slice: s.name, names: s.lines.filter(l => l.role === 'left out').map(l => l.name) })).filter(l => l.names.length),
    slices
  };
}
