// ===========================================
// OUTLINE GOALS - Taps and keys (feature: outline-goals)
// The Outline attaches outlineGoalsClick and outlineGoalsKey to its page and to the board sheet. Everything this feature draws
// says what it does in data-goals-action, so these only answer those taps and leave the Outline's own alone.
// ===========================================

import { projectState } from '../../core/projections.js';
import { openBoardSheet } from '../board/sheets/shared.js';
import { openModelNameSheet } from '../board/sheets/sliceMenu.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { render } from '../../ui/feed.js';
import { showToast } from '../../ui/toast.js';
import { toastWithUndo } from '../undo/command.js';
import { criterionEditor } from './criterionEditor.read.js';
import { criterionSheet } from './outlineGoals.parts.js';
import { goalsOf } from './rules.js';
import { goalsUi } from './uiState.js';
import { addCriterion, rewordCriterion, tagCriterion, removeCriterion, linkProof, unlinkProof, describeChapter, draftEvent, dropDraftEvent, newCriterionId } from './command.js';

const value = id => document.getElementById(id)?.value.trim() || '';

// The sheet for a criterion (a new one when criterionId is null)
function openCriterion(criterionId) {
  const view = criterionEditor(projectState(), criterionId);
  if (!view) return;
  openBoardSheet(criterionSheet(view), 'ogCritText');
}

// Save the sheet: what changed becomes events, all of one tap (Undo takes them all back)
function saveCriterion(root) {
  const id = root.dataset.criterion || null;
  const text = value('ogCritText');
  const chapters = [...root.querySelectorAll('[data-goals-action=toggle-chapter].on')].map(b => b.dataset.chapter);
  const refused = [];
  if (!id) refused.push(addCriterion({ criterionId: newCriterionId(), text, chapters }));
  else {
    refused.push(rewordCriterion({ criterionId: id, text }), tagCriterion({ criterionId: id, chapters }));
    const now = goalsOf(projectState()).criteria[id]?.proofs || [];
    const picks = [...root.querySelectorAll('[data-goals-action=toggle-proof]')];
    for (const b of picks) {
      const on = b.classList.contains('on'), scenarioId = b.dataset.scenario;
      if (on && !now.includes(scenarioId)) refused.push(linkProof({ criterionId: id, scenarioId }));
      if (!on && now.includes(scenarioId)) refused.push(unlinkProof({ criterionId: id, scenarioId }));
    }
  }
  const why = refused.find(Boolean);
  if (why) { showToast(why); return; }
  hideAllSheets();
  render();
  toastWithUndo(id ? 'Criterion saved' : 'Criterion added');
}

function saveDescription(chapterId) {
  const why = describeChapter({ chapterId, description: value('ogChapterDesc') });
  if (why) { showToast(why); return; }
  goalsUi.editingChapter = null;
  render();
}

function saveDraft(chapterId) {
  const name = value('ogDraftName');
  if (!name) { goalsUi.draftingChapter = null; render(); return; }
  const why = draftEvent({ chapterId, name });
  if (why) { showToast(why); return; }
  // Stay open for the next one, as when typing a list
  render();
  document.getElementById('ogDraftName')?.focus();
}

export function outlineGoalsClick(e) {
  const t = e.target.closest('[data-goals-action]');
  if (!t || t.disabled) return;
  const a = t.dataset.goalsAction;
  if (a === 'edit-goal') openModelNameSheet();
  else if (a === 'add-criterion') openCriterion(null);
  else if (a === 'open-criterion') openCriterion(t.dataset.criterion);
  else if (a === 'toggle-chapter' || a === 'toggle-proof') { const on = !t.classList.contains('on'); t.classList.toggle('on', on); t.setAttribute('aria-pressed', String(on)); }
  else if (a === 'save-criterion') saveCriterion(t.closest('[data-component="Criterion sheet"]'));
  else if (a === 'remove-criterion') {
    removeCriterion({ criterionId: t.closest('[data-component="Criterion sheet"]').dataset.criterion });
    hideAllSheets();
    render();
    toastWithUndo('Criterion removed');
  }
  else if (a === 'edit-description') { goalsUi.editingChapter = t.dataset.chapter; render(); document.getElementById('ogChapterDesc')?.focus(); }
  else if (a === 'cancel-description') { goalsUi.editingChapter = null; render(); }
  else if (a === 'save-description') saveDescription(t.dataset.chapter);
  else if (a === 'add-draft') { goalsUi.draftingChapter = t.dataset.chapter; render(); document.getElementById('ogDraftName')?.focus(); }
  else if (a === 'cancel-draft') { goalsUi.draftingChapter = null; render(); }
  else if (a === 'save-draft') saveDraft(t.dataset.chapter);
  else if (a === 'drop-draft') { dropDraftEvent({ chapterId: t.dataset.chapter, name: t.dataset.name }); render(); }
}

// Enter saves what is being typed: a draft event's name, a criterion's words (Shift+Enter is a new line), a chapter's description
export function outlineGoalsKey(e) {
  if (e.key === 'Escape' && (goalsUi.draftingChapter || goalsUi.editingChapter) && e.target.closest('.og-brief, .og-drafts')) {
    goalsUi.draftingChapter = goalsUi.editingChapter = null; render(); return;
  }
  if (e.key !== 'Enter' || e.shiftKey) return;
  if (e.target.id === 'ogDraftName') { e.preventDefault(); saveDraft(goalsUi.draftingChapter); }
  else if (e.target.id === 'ogCritText') { e.preventDefault(); saveCriterion(e.target.closest('[data-component="Criterion sheet"]')); }
  else if (e.target.id === 'ogChapterDesc') { e.preventDefault(); saveDescription(goalsUi.editingChapter); }
}
