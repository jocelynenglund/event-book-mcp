// ===========================================
// PAD - Event Maker (SV: Pad Event Maker)
// Under the toolbar, when exactly one orange note is selected: the command that makes that event, "Made by <Command> ↗", which a tap
// jumps to (its frame comes into view and is selected). An event is made by one command (padEventMaker.rules.js: the frames that hold
// it and a blue note); when two commands' frames hold it, it says so ("⚠ Made by 2 commands:" then A ↗, B ↗, each its own jump). An event no
// frame's command makes yet says so (`none`: "No command makes this yet", nothing to jump to); nothing is shown for an external event (another
// system's) or for anything but one orange note.
// -> { visible, event, warning: string | null, none: string | null, makers: [{ command, frameId, label }] }
// ===========================================

import { makersOf } from './padEventMaker.rules.js';
import { parseNote } from './padNote.rules.js';

const NONE = { visible: false, event: '', warning: null, none: null, makers: [] };

export function padEventMaker(state, { selectedIds = [] } = {}) {
  const pad = state.pad || { notes: {}, frames: {} }, chosen = selectedIds.map(id => pad.notes[id]).filter(Boolean);
  if (chosen.length !== 1 || chosen[0].colour !== 'orange') return NONE;
  const parsed = parseNote(chosen[0].text, 'orange');
  if (!parsed.name || parsed.external) return NONE;
  const makers = makersOf(pad, parsed.name).map(m => ({ ...m, label: `Made by ${m.command} ↗` }));
  if (!makers.length) return { visible: true, event: parsed.name, warning: null, none: 'No command makes this yet', makers: [] };
  return { visible: true, event: parsed.name, warning: makers.length > 1 ? `⚠ Made by ${makers.length} commands:` : null, none: null, makers };
}
