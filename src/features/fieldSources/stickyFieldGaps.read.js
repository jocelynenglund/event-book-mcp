// ===========================================
// FIELD SOURCES - Sticky Field Gaps (SV)
// The stickies of one slice whose fields are checked (an event its command makes, a read model, a command with a
// screen or an automation), each field saying whether it has a source: { name, gap, why?, fix? }, and how when it is
// set by the system. The board and the slice page mark the gaps from it. A piece of a field written as prose is a gap
// too (tidy: true): its ⚠ opens the tidy sheet.
// ===========================================

import { fieldKey } from '../../core/constants.js';
import { fieldSources } from './rules.js';

export function stickyFieldGaps(state, sliceId) {
  const slice = state.slices[sliceId];
  if (!slice) return [];
  const { at, checked } = fieldSources(state);
  return slice.elements.filter(id => checked[sliceId]?.[id]).map(id => state.elements[id]).filter(Boolean).map(el => ({
    elementId: el.id, sticky: el.name,
    fields: (el.properties || []).map(p => {
      const g = at.get(`${sliceId}|${el.id}|${p.name}`);
      const how = el.setBySystem?.[fieldKey(p.name)]?.how;
      return g ? { name: p.name, gap: true, ...(g.kind === 'tidy' ? { tidy: true } : {}), why: g.why, fix: g.fix } : { name: p.name, gap: false, ...(how ? { system: how } : {}) };
    })
  }));
}
