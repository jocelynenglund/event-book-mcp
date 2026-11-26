// ===========================================
// PAD - Which command makes an event (pure)
// Only one command makes an event, and on the Pad that is told by the frames: a frame (a sketched slice) that holds a blue command note and an
// orange note of the event's name is "made by" that command. A loose note counts for nothing, and a frame with no command makes nothing.
// An event is found by its name, so every place of a linked note and every other orange note of that name are looked at; a name marked
// external ("(external)": padNote.rules.js) is another system's and has no maker. -> [{ command, frameId, frameName }], one per command
// (two frames holding the same command count once, the first), in the frames' order of adding.
// ===========================================

import { notesInFrame, KIND_OF } from './sketch.js';
import { parseNote } from './padNote.rules.js';

const key = name => name.toLowerCase();

export function makersOf(pad, eventName) {
  const wanted = key(eventName || ''), makers = new Map();
  if (!wanted) return [];
  Object.values(pad?.frames || {}).forEach(frame => {
    const inside = notesInFrame(pad, frame).map(n => ({ n, parsed: parseNote(n.text, n.colour) }));
    const command = inside.find(x => KIND_OF[x.n.colour] === 'command' && x.parsed.name);
    if (command && inside.some(x => x.parsed.kind === 'event' && !x.parsed.external && key(x.parsed.name) === wanted) && !makers.has(key(command.parsed.name))) {
      makers.set(key(command.parsed.name), { command: command.parsed.name, frameId: frame.id, frameName: frame.name.trim() });
    }
  });
  return [...makers.values()];
}
