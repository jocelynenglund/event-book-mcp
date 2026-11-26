// ===========================================
// PAD - What a screen's text maps (pure; used by Save Screen Text, Make chapter, Update chapter and the Screen Text Editor)
// A screen is where fields come from and go to, so its text says how they are mapped (FieldMapped: target ← source):
//   an [ Input ] goes to the same-named field of the command its ( Button ) sends:   command.input ← screen.input
//   a { View: a, b } puts the view's fields a, b on the screen:                       screen.a ← view.a
// in each slice the screen is in: a slice with a command takes the inputs, a slice with only a read model shows it (as padScreen.rules.js reads
// them). A field whose target already comes from something else (mapped by hand) is left alone, and a field the view does not have is not mapped
// (the completeness check says so). What the text no longer says is cleared: a mapping from this screen to a command's field that is no longer
// an input, and a mapping of the screen's field from a view's field that is no longer listed.
// plan -> { map: [{ elementId, field, from: { elementId, field }, have, label, text }], clear: [{ elementId, field, text }] }
//   `have`: the mapping is there already. `ensure`: the sticky must carry the field first (the screen, and the command).
// ===========================================

import { fieldKey } from '../../core/constants.js';
import { parseScreen, inputsForCommand } from './padScreen.rules.js';
import { propOf } from '../fieldMapping/mappings.js';
import { titleCase } from './padNote.rules.js';

const same = (a, b) => titleCase(a).toLowerCase() === titleCase(b).toLowerCase();

export function planScreenMappings(state, screenId, text) {
  const screen = state.elements[screenId], plan = { map: [], clear: [] };
  if (screen?.type !== 'screen') return plan;
  const parsed = parseScreen(text ?? screen.sketch ?? '');
  const commandNames = Object.values(state.elements).filter(e => e.type === 'command').map(e => e.name);
  const slices = state.sliceOrder.map(id => state.slices[id]).filter(s => s?.elements.includes(screenId));
  const wanted = new Set(), seen = new Set();
  const want = (target, field, source, label, text) => {
    const key = `${target.id}|${fieldKey(field)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const was = target.mappings?.[fieldKey(field)]?.from;
    if (was && !(was.elementId === source.id && fieldKey(was.field) === fieldKey(field))) return;   // it comes from somewhere else: leave it
    wanted.add(key);
    plan.map.push({ elementId: target.id, field, from: { elementId: source.id, field }, have: !!was, label, text });
  };
  slices.forEach(slice => {
    const els = slice.elements.map(id => state.elements[id]).filter(Boolean), commands = els.filter(e => e.type === 'command');
    if (commands.length) commands.forEach(c => inputsForCommand(parsed, c.name, commandNames).forEach(i => want(c, i.field, screen, '[ ]', `${i.field} → ${c.name}`)));
    else els.filter(e => e.type === 'readModel').forEach(view => {
      const shown = parsed.readModels.find(r => same(r.name, view.name));
      const fields = (shown?.fields || []).filter(f => propOf(view, f));
      fields.forEach(f => want(screen, f, view, '{ }', `${f} ← ${view.name}`));
    });
  });
  const inSlice = id => slices.some(s => s.elements.includes(id));
  Object.values(state.elements).forEach(el => Object.values(el.mappings || {}).forEach(m => {
    const key = `${el.id}|${fieldKey(m.field)}`, source = state.elements[m.from.elementId];
    if (wanted.has(key) || !source) return;
    if (m.from.elementId === screenId && el.type === 'command' && inSlice(el.id)) plan.clear.push({ elementId: el.id, field: m.field, text: `${m.field} no longer comes from the screen` });
    else if (el.id === screenId && source.type === 'readModel' && inSlice(source.id)) plan.clear.push({ elementId: el.id, field: m.field, text: `${m.field} no longer comes from ${source.name}` });
  }));
  return plan;
}
