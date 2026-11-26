// ===========================================
// OUTLINE GOALS - Screen part of the Outline (feature: outline-goals)
// The Outline hands this the book's state once per draw, and gets back what goes on top (the goal, the pills, the acceptance
// criteria) and what goes under each chapter's heading (its brief, its draft events, its ladder). Each part reads its own view.
// ===========================================

import { outlineGoal } from './outlineGoal.read.js';
import { outlineSummary } from './outlineSummary.read.js';
import { criteriaProven } from './criteriaProven.read.js';
import { acceptanceCriteria } from './acceptanceCriteria.read.js';
import { chapterBrief } from './chapterBrief.read.js';
import { chapterDraftEvents } from './chapterDraftEvents.read.js';
import { chapterLadder } from './chapterLadder.read.js';
import { outlineGoalCard, outlineSummaryPills, provenPill, acceptanceCriteriaList, chapterBriefCard, chapterDraftChips, chapterLadderRungs } from './outlineGoals.parts.js';
import { goalsUi } from './uiState.js';
import { ensureOutlineGoalsStyles } from './styles.js';
import { installOutlineGoalsGuards } from './wire.js';

export { outlineGoalsClick, outlineGoalsKey } from './wire.js';

// ui: editable (the book can be changed here), anyScenarios (the pill of proven criteria waits for a first scenario),
// searching (a text search is on: only the slices matching it are shown; a stage filter hides slices only)
export function outlineGoalsFor(state, ui = {}) {
  ensureOutlineGoalsStyles();
  installOutlineGoalsGuards();
  const editable = ui.editable !== false;
  if (ui.searching) return { top: '', chapter: () => '' };
  const proven = criteriaProven(state);
  const top = `<div class="og-top">
      ${outlineGoalCard(outlineGoal(state), { editable })}
      <div class="og-pill-row">${outlineSummaryPills(outlineSummary(state))}${ui.anyScenarios ? provenPill(proven) : ''}</div>
      ${acceptanceCriteriaList(acceptanceCriteria(state), { editable })}
    </div>`;
  const chapter = ch => !ch.id || ch.folded ? '' : `<div class="og-chapter">
      ${chapterBriefCard(chapterBrief(state, ch.id), { editable, editing: goalsUi.editingChapter === ch.id })}
      ${chapterDraftChips(chapterDraftEvents(state, ch.id), { editable, drafting: goalsUi.draftingChapter === ch.id, menu: goalsUi.draftMenu?.chapterId === ch.id ? goalsUi.draftMenu.name : null })}
      ${chapterLadderRungs(chapterLadder(state, ch.id), { open: goalsUi.ladderOpen.has(ch.id) })}
    </div>`;
  return { top, chapter };
}
