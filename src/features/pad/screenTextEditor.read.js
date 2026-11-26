// ===========================================
// PAD - Screen Text Editor (SV)
// The board's screen editor: a screen sticky edited as text, the notation of the Pad's screen note (padScreen.rules.js), with the window it draws
// as it is typed and what the text maps (screenMappings.rules.js). `typed` is what is in the box now (this device's); without it the sticky's own
// sketch, or its name when it has none yet.
// -> { elementId, name, text, wire: { key, title, empty, lines: [[part]] }, maps: [{ label, text }] } or null for a sticky that is not a screen.
//    maps: '[ ]' an input → its command, '{ }' the fields of a view → the screen, '✕' what the text no longer says.
// ===========================================

import { wireframe } from './padScreen.rules.js';
import { planScreenMappings } from './screenMappings.rules.js';

export function screenTextEditor(state, elementId, typed = null) {
  const el = state.elements[elementId];
  if (el?.type !== 'screen') return null;
  const text = typed ?? (el.sketch || el.name);
  const plan = planScreenMappings(state, elementId, text), maps = [];
  plan.map.filter(m => m.label === '[ ]').forEach(m => maps.push({ label: m.label, text: m.text }));
  [...new Set(plan.map.filter(m => m.label === '{ }').map(m => m.from.elementId))].forEach(viewId => {
    const rows = plan.map.filter(m => m.label === '{ }' && m.from.elementId === viewId);
    maps.push({ label: '{ }', text: `${rows.map(m => m.field).join(', ')} ← ${state.elements[viewId].name}` });
  });
  plan.clear.forEach(c => maps.push({ label: '✕', text: c.text }));
  return { elementId, name: el.name, text, wire: { key: `edit:${elementId}`, ...wireframe(text) }, maps };
}
