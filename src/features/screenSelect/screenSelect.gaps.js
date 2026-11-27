// SCREEN SELECT - The completeness check for a pick-one or pick-many field (called by fieldSources/rules.js with its own `gap`)
// A select field takes its options from a view: one that is not in the book (or is not a read model) is a gap on the screen's field, once, in the first
// slice the screen is in. When the view is there the field counts as sourced: its options come from that view. Hidden and required fields need nothing more
// here: a screen's own fields are not checked for a source, and the command it feeds already must carry what the screen sends (screenGaps.js).
import { optionsView } from './screenSelect.rules.js';

export function selectGaps(state, slice, screens, gap) {
  const first = id => state.sliceOrder.map(s => state.slices[s]).find(s => s?.elements.includes(id));
  screens.forEach(screen => {
    if (first(screen.id)?.id !== slice.id) return;
    (screen.properties || []).filter(p => p.select && p.optionsFrom && !optionsView(state, p.optionsFrom)).forEach(p =>
      gap(screen, p.name, `${screen.name}.${p.name}: options from ${p.optionsFrom}, which isn't in the book`, `add a view called ${p.optionsFrom}, or pick the view ${p.name} takes its options from`, 'screenSelect'));
  });
}
