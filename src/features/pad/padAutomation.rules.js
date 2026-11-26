// ===========================================
// PAD - What an automation note says, read leniently (SV: Pad Automation Text)
// An automation note (lilac, the board's processor colour, drawn with a ⚙) is the policy "when this is so, do that". It ALWAYS reads a
// read model (a view, whose events may be ours or another system's), and then either triggers a command or translates into an event of its own:
//   Send Reminders              the first line is the automation's name
//   reads Reminders Due         the read model it reads (one line, required; "reads: Reminders Due" is fine)
//   → Send Reminder             what it does (also written "->"): a command it triggers, or an event it translates into
// The → name is a command when a blue Pad note or a command sticky of the book has it, an event when an orange Pad note or an event sticky has it
// (a name that is both, or neither, is made a command and says so). Any other line is plain text, drawn as typed. Nothing here refuses: what can not
// be placed is a warning, never dropped without a word. One reader serves the drawing, Make chapter and the frame's warning.
// ===========================================

import { titleCase } from './padNote.rules.js';

const READS = /^reads\b\s*:?\s*(.*)$/i;
const ARROW = /^(?:→|->|=>)\s*(.*)$/;
const lines = text => String(text ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
const key = name => titleCase(name).toLowerCase();
const GEAR = /^⚙️?\s*/;

// The note as the drawing needs it: { title, rows: [{ kind: 'reads' | 'target' | 'text', text }] } (title as typed, without a ⚙ she typed herself)
export function automationLines(text) {
  const [first = '', ...rest] = lines(text);
  return {
    title: first.replace(GEAR, ''),
    rows: rest.map(raw => {
      const reads = raw.match(READS), arrow = raw.match(ARROW);
      return reads ? { kind: 'reads', text: reads[1].trim() } : arrow ? { kind: 'target', text: arrow[1].trim() } : { kind: 'text', text: raw };
    })
  };
}

// What it says: { name, reads: Title Case | null, target: Title Case | null, problems } (the first reads line and the first → line count; a second is a problem)
export function readAutomation(text) {
  const { title, rows } = automationLines(text), out = { name: titleCase(title), reads: null, target: null, problems: [] };
  for (const kind of ['reads', 'target']) {
    const mine = rows.filter(r => r.kind === kind);
    out[kind] = titleCase(mine[0]?.text || '') || null;
    if (mine.length > 1) out.problems.push(`An automation has one ${kind === 'reads' ? 'reads line' : '→ line'}: ${mine.slice(1).map(r => r.text).join(', ')} is left out`);
  }
  return out;
}

// What Make chapter does with an automation note: the read model, and whether the → is a command it triggers or an event it translates into.
// names: namesKnown (padScenario.rules.js). -> { name, reads, target, targetKind: 'command' | 'event' | null, readsKnown, warnings }
// triggered: the frame holds the event it wakes on (an external or earlier event), so it needs no read model
export function previewAutomation(text, names, { triggered = false } = {}) {
  const read = readAutomation(text), warnings = [...read.problems];
  const command = !!read.target && (names.commands.has(key(read.target)) || names.padCommands.has(key(read.target)));
  const event = !!read.target && names.events.has(key(read.target));
  if (!read.reads && !triggered) warnings.push('An automation reads a read model: add a line "reads <Read model>"');
  const readsKnown = !!read.reads && names.views.has(key(read.reads));
  if (read.reads && !readsKnown) warnings.push(`Unknown read model ${read.reads} (it is made new)`);
  if (!read.target) warnings.push('An automation triggers a command or translates into an event: add a line "→ <Command or Event>"');
  else if (command && event) warnings.push(`${read.target} is both a command and an event: it is made a command`);
  else if (!command && !event) warnings.push(`Unknown ${read.target}: it is made a command (an event is an orange note or a sticky of the book)`);
  return { ...read, targetKind: read.target ? (event && !command ? 'event' : 'command') : null, readsKnown, warnings };
}

// The blue note an automation frame holds as the command it sends: the one named by its → (Title Case, any spelling), or, when the automation has no →,
// the frame's only blue note. `commands` are [{ name, ... }] (the frame's blue notes). Null when none belongs (a second, unrelated command does not).
export function ownCommand(text, commands) {
  const target = readAutomation(text).target;
  if (target) return commands.find(c => key(c.name) === key(target)) || null;
  return commands.length === 1 ? commands[0] : null;
}
