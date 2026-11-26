// ===========================================
// PAD - The sketch in the book (pure, over the projection's state)
// state.pad = { notes: { id → { id, x, y, colour, text } }, frames: { id → { id, x, y, w, h, name, chapterId, sliceId, made } } }  (chapterId, sliceId and made: what Make chapter built it into and from), in the order
// they were added (the later one draws on top). A frame holds the notes whose middle is inside it, by position: nothing
// records which, so a note follows the frame it is moved into or out of. Nothing here is the model: no Pad event clears Refined.
// A linked copy (PadNoteLinked) is another place for the same note: its text and colour are the original's, so editing or
// recolouring any one is one event on the original and all say it. note.linkOf is the original's id (null for the original
// and for a note on its own); the original is the oldest of the copies, and when it leaves (removed, unlinked) the oldest
// copy takes its place.
// ===========================================

export const NOTE_SIZE = 180;                     // a note is a plain square this big, in the Pad's own units
export const SCREEN_WIDTH = 240;                  // a screen note is wider: a window with room for a read model, an input and a button
export const FRAME_MIN = 220;                     // a frame is never smaller than a note and a bit
export const GROUP_MARGIN = 24, GROUP_HEAD = 40;  // Group: round the notes, with room above for the frame's name
export const NOTE_GAP = 24, ROW_OF = 5;            // ＋ Events: the space between notes, and how many make a row
export const COLOURS = ['blue', 'orange', 'green', 'red', 'white', 'scenario', 'screen', 'automation'];
// A note's colour is what it stands for: blue a command, orange an event, green a view, red a hotspot (a question, a risk), white a plain note,
// warm grey a scenario (Given / When / Then, typed freely: padScenario.rules.js), a white window a screen ({ Read Model }, [ Input ], ( Button ): padScreen.rules.js), lilac for an automation (⚙ reads a read model, → a command or an event: padAutomation.rules.js)
export const KIND_OF = { blue: 'command', orange: 'event', green: 'readModel', red: 'hotspot', white: 'note', scenario: 'scenario', screen: 'screen', automation: 'automation' };

const num = v => Math.round(Number(v) || 0);

// The notes that are one linked note: the original (or the note on its own) and its copies, oldest first
export const originalId = (pad, id) => pad.notes[id]?.linkOf || id;
export const placesOf = (pad, id) => {
  const root = originalId(pad, id);
  return Object.values(pad.notes).filter(n => n.id === root || n.linkOf === root);
};

// A note leaves its linked note (removed, or unlinked): when it was the original, the oldest copy becomes the original
function leaveLinks(pad, note) {
  const copies = Object.values(pad.notes).filter(n => n.linkOf === note.id);
  copies.forEach((c, i) => { c.linkOf = i ? copies[0].id : null; });
  note.linkOf = null;
}

// One Pad event folded into the state
export function padFold(state, { type, data: d }) {
  const pad = state.pad ||= { notes: {}, frames: {} };
  const note = pad.notes[d.noteId], frame = pad.frames[d.frameId];
  if (type === 'PadNoteAdded') pad.notes[d.noteId] = { id: d.noteId, x: num(d.x), y: num(d.y), colour: COLOURS.includes(d.colour) ? d.colour : 'blue', text: String(d.text ?? ''), linkOf: null };
  else if (type === 'PadNoteLinked' && pad.notes[d.linkOf] && !note) {
    const original = pad.notes[originalId(pad, d.linkOf)];
    pad.notes[d.noteId] = { id: d.noteId, x: num(d.x), y: num(d.y), colour: original.colour, text: original.text, linkOf: original.id };
  }
  else if (type === 'PadNoteUnlinked' && note) leaveLinks(pad, note);
  else if (type === 'PadNoteMoved' && note) Object.assign(note, { x: num(d.x), y: num(d.y) });
  else if (type === 'PadNoteEdited' && note) placesOf(pad, note.id).forEach(n => { n.text = String(d.text ?? ''); });
  else if (type === 'PadNoteRecoloured' && note && COLOURS.includes(d.colour)) placesOf(pad, note.id).forEach(n => { n.colour = d.colour; });
  else if (type === 'PadNoteRemoved') { if (note) leaveLinks(pad, note); delete pad.notes[d.noteId]; }
  else if (type === 'PadFrameAdded') pad.frames[d.frameId] = { id: d.frameId, x: num(d.x), y: num(d.y), w: Math.max(FRAME_MIN, num(d.w)), h: Math.max(FRAME_MIN, num(d.h)), name: String(d.name ?? ''), chapterId: null, sliceId: null, made: null };
  else if (type === 'PadFrameChanged' && frame) {
    for (const k of ['x', 'y']) if (k in d) frame[k] = num(d[k]);
    for (const k of ['w', 'h']) if (k in d) frame[k] = Math.max(FRAME_MIN, num(d[k]));
    if ('name' in d) frame.name = String(d.name ?? '');
  }
  else if (type === 'PadFrameRemoved') delete pad.frames[d.frameId];
  else if (type === 'PadFrameConverted' && frame) Object.assign(frame, { chapterId: d.chapterId, sliceId: d.sliceId ?? null, made: d.made ?? null });
}

// The notes whose middle is inside the frame, left to right then top to bottom
export function notesInFrame(pad, frame) {
  const mid = NOTE_SIZE / 2;
  return Object.values(pad?.notes || {})
    .filter(n => n.x + mid >= frame.x && n.x + mid <= frame.x + frame.w && n.y + mid >= frame.y && n.y + mid <= frame.y + frame.h)
    .sort((a, b) => a.x - b.x || a.y - b.y);
}

// Where ＋ Events puts `count` notes: a grid of up to ROW_OF a row, centred on the point `at`; when that lands on a note or a frame
// it moves down, below what is in the way, until it is clear. -> [{ x, y }] in reading order
export function gridFor(pad, count, at) {
  const cols = Math.min(ROW_OF, count), step = NOTE_SIZE + NOTE_GAP;
  const w = cols * step - NOTE_GAP, h = Math.ceil(count / (cols || 1)) * step - NOTE_GAP;
  const x = Math.round(at.x - w / 2);
  let y = Math.round(at.y - h / 2);
  const taken = [...Object.values(pad.notes).map(n => ({ x: n.x, y: n.y, w: NOTE_SIZE, h: NOTE_SIZE })), ...Object.values(pad.frames)];
  const inTheWay = () => taken.filter(r => r.x < x + w && r.x + r.w > x && r.y < y + h && r.y + r.h > y);
  for (let hit = inTheWay(); hit.length && count; hit = inTheWay()) y = Math.max(...hit.map(r => r.y + r.h)) + NOTE_GAP;
  return Array.from({ length: count }, (_, i) => ({ x: x + (i % cols) * step, y: y + Math.floor(i / cols) * step }));
}

// The frame that goes round these notes (Group)
export function frameAround(notes) {
  const x = Math.min(...notes.map(n => n.x)) - GROUP_MARGIN, y = Math.min(...notes.map(n => n.y)) - GROUP_MARGIN - GROUP_HEAD;
  return { x, y, w: Math.max(...notes.map(n => n.x + NOTE_SIZE)) + GROUP_MARGIN - x, h: Math.max(...notes.map(n => n.y + NOTE_SIZE)) + GROUP_MARGIN - y };
}
