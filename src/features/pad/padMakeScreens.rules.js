// ===========================================
// PAD - Screens in Make chapter (pure; used by Pad Make Chapter)
// A screen is ONE screen in event modeling, shown in several slices: a screen note (or a linked copy of it) in a frame puts the screen in that
// frame's slice, and the screen goes too into the slice of each { Read Model } it shows (its view) and of each ( Button ) that sends a command
// (its command slice) when those frames are being made as well: an implied line, which can be unticked like any other. It is one sticky, by name.
//   its inputs [ x ] are fields of the command of a slice it is in (not an input on the line of a button that sends another command);
//   each button is matched to a command by name (padScreen.rules.js matchButton: the batch's commands, then the board's);
//   each { Read Model: fields } should be one of the batch's views or the board's, with those fields.
// What does not fit is a warning on the screen's first line, said once. A screen line is { role: 'screen', name, implied, screenText, rows, warnings }:
// rows say what the screen is to this slice, `via` on a field line says which screen it came from.
// ===========================================

import { parseScreen, matchButton, inputsForCommand } from './padScreen.rules.js';
import { fieldKey } from '../../core/constants.js';
import { lower } from './padMade.rules.js';

const mainOf = slice => slice.lines.find(l => l.role === 'command' || l.role === 'view');
const unique = names => [...new Map(names.filter(Boolean).map(n => [lower(n), n])).values()];

// The screen as the batch reads it: where its buttons go and what its read models are (with a warning for what does not fit)
function readScreen(state, made, line) {
  const screen = parseScreen(line.screenText);
  const commands = unique([...made.filter(s => s.kind === 'command').map(s => mainOf(s).name), ...Object.values(state.elements).filter(e => e.type === 'command').map(e => e.name)]);
  const buttons = screen.buttons.map(b => ({ ...b, ...matchButton(b.label, commands) }));
  const warnings = buttons.map(b => b.warning).filter(Boolean);
  screen.readModels.forEach(rm => {
    const view = made.find(s => s.kind === 'readModel' && lower(mainOf(s).name) === lower(rm.name));
    const sticky = Object.values(state.elements).find(e => e.type === 'readModel' && lower(e.name) === lower(rm.name));
    const has = view ? view.lines.filter(l => l.role === 'field').map(l => l.name) : (sticky?.properties || []).map(p => p.name);
    if (!view && !sticky) warnings.push(`${rm.name} is not in these frames or on the board`);
    else rm.fields.filter(f => !has.some(h => fieldKey(h) === fieldKey(f))).forEach(f => warnings.push(`${rm.name} has no field ${f}`));
  });
  return { screen, buttons, warnings, commands };
}

// slices: the preview's slices that make something (lines in place). Adds the implied screen lines and the inputs as field lines.
export function addScreens(state, slices, off) {
  const sources = new Map();   // screen name → its first line (the screen's text is the first one's)
  slices.forEach(s => s.lines.filter(l => l.role === 'screen').forEach(l => sources.has(lower(l.name)) || sources.set(lower(l.name), l)));
  sources.forEach(source => {
    const read = readScreen(state, slices, source);
    let warned = false;
    slices.forEach(slice => {
      const main = mainOf(slice);
      // An automation frame (or one with no command or view) has nothing a screen shows or sends: leave it alone
      if (!main) return;
      let line = slice.lines.find(l => l.role === 'screen' && lower(l.name) === lower(source.name));
      const shown = read.screen.readModels.some(rm => lower(rm.name) === lower(main.name)), sends = read.buttons.some(b => b.command && lower(b.command) === lower(main.name));
      if (!line && !((slice.kind === 'readModel' && shown) || (slice.kind === 'command' && sends))) return;
      if (!line) {
        const key = `screen:${slice.frameId}:${source.name}`;
        line = { key, noteId: null, role: 'screen', label: 'Screen', text: source.name, name: source.name, note: 'also placed here', included: !off.includes(key), tickable: true, implied: true, screenText: source.screenText };
        slice.lines.push(line);
      }
      const inputs = slice.kind === 'command' ? inputsForCommand(read.screen, main.name, read.commands) : [];
      line.rows = slice.kind === 'command'
        ? [...inputs.map(i => ({ label: '[ ]', text: `${i.field} → field of ${main.name}` })), ...read.buttons.filter(b => b.command && lower(b.command) === lower(main.name)).map(b => ({ label: '( )', text: `${b.label} → sends ${main.name}` }))]
        : read.screen.readModels.filter(rm => lower(rm.name) === lower(main.name)).map(rm => ({ label: '{ }', text: `${rm.name} → shown by this view` }));
      line.warnings = warned ? [] : read.warnings;
      warned = true;
      if (!line.included) return;
      const at = slice.lines.reduce((n, l, i) => (l.role === 'field' && l.noteId === main.noteId ? i : n), slice.lines.indexOf(main));
      const fresh = inputs.filter(i => !slice.lines.some(l => l.role === 'field' && fieldKey(l.name) === fieldKey(i.field)));
      slice.lines.splice(at + 1, 0, ...fresh.map(i => ({ key: `${line.key}:in:${i.field}`, noteId: main.noteId, role: 'field', text: i.field, name: i.field, note: null, via: `${source.name} screen`, included: !off.includes(`${line.key}:in:${i.field}`), tickable: true })));
    });
  });
}
