// ===========================================
// OUTLINE DESKTOP - Outline Chapter Rail (SV: S1 Chapter rail)
// The chapters in timeline order for the rail on the left: each with how many of its slices are refined, a bar for it, and
// what is worth a look (its gaps, or that it holds no scenario yet). layout: the Outline Layout (so a search or a stage
// filter leaves out the chapters with nothing to show). current: the chapter the document is at (a device's own scroll).
// ===========================================

import { getScenariosForSlice, refinedLabel } from '../../core/projections.js';
import { gapCount } from '../fieldSources/rules.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function outlineChapterRail(state, layout, { current = null } = {}) {
  return {
    chapters: (layout.chapters || []).filter(ch => !ch.loose || ch.inChapter.length).map(ch => {
      const total = ch.inChapter.length;
      const refined = ch.inChapter.filter(s => s.refined).length;
      const gaps = gapCount(state, ch.inChapter.map(s => s.id));
      const scenarios = ch.inChapter.reduce((n, s) => n + getScenariosForSlice(s.id, state).length, 0);
      return {
        id: ch.id || '', name: ch.name,
        refined, total,
        text: total ? refinedLabel(refined, total) : 'no slices',
        percent: total ? Math.round(100 * refined / total) : 0,
        gaps, note: gaps ? plural(gaps, 'gap', 'gaps') : total && !scenarios ? 'no scenarios' : '',
        on: (ch.id || '') === (current || '')
      };
    })
  };
}
