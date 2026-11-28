// ALTERNATE FLOWS - Chapter Alternate Flows Option (SV)
// What a chapter's ⋮ menu offers: "Put alternates in flows", with how many alternates have no flow yet. null when none (nothing is drawn).
// -> { chapterId, count }
import { needsFlow } from './alternateFlows.rules.js';

export function chapterAlternateFlowsOption(state, chapterId) {
  const count = Object.values(state.slices).filter(s => s.chapterId === chapterId && needsFlow(state, s)).length;
  return count ? { chapterId, count } : null;
}
