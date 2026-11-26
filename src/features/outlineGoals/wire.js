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
import { criterionSheet, makeSliceForm } from './outlineGoals.parts.js';
import { goalsOf } from './rules.js';
import { makeSliceSheet } from './makeSliceSheet.read.js';
import { suggestShow, suggestClear, suggestKey, initSuggest } from '../pad/suggestInput.js';
import { goalsUi } from './uiState.js';
import { addCriterion, rewordCriterion, tagCriterion, removeCriterion, linkProof, unlinkProof, describeChapter, draftEvent, makeDraftASlice, dropDraftEvent, newCriterionId } from './command.js';

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

// Redrawing removes the focused input, which fires a focusout we must not take for the person leaving it
let redrawing = false;
function redraw() { redrawing = true; try { render(); } finally { redrawing = false; } }

function saveDraft(chapterId) {
  const name = value('ogDraftName');
  suggestClear();
  if (!name) { goalsUi.draftingChapter = null; redraw(); return; }
  const why = draftEvent({ chapterId, name });
  if (why) { showToast(why); return; }
  // Stay open for the next one, as when typing a list
  redraw();
  document.getElementById('ogDraftName')?.focus();
}

// Local guards, set up once: leaving the draft input closes it (keeping what was typed); a tap elsewhere closes a chip's menu;
// on a phone the book's bottom bar steps aside while a field in the Outline has the keyboard up (the CSS keys off body.og-typing).
let guarded = false;
export function installOutlineGoalsGuards() {
  if (guarded || typeof document === 'undefined') return;
  guarded = true;
  initSuggest();
  document.addEventListener('input', e => {
    const box = e.target;
    if (box.id === 'ogDraftName') suggestShow({ box, mount: document.getElementById('ogDraftSuggest'), getState: projectState, colour: 'orange' });
    else if (box.id === 'ogMakeCommand') suggestShow({ box, mount: document.getElementById('ogMakeSuggest'), getState: projectState, colour: 'blue' });
  });
  document.addEventListener('focusin', e => {
    if (e.target.closest?.('#outlineView') && e.target.matches?.('input, textarea')) document.body.classList.add('og-typing');
  });
  document.addEventListener('focusout', e => {
    if (e.target.matches?.('input, textarea')) document.body.classList.remove('og-typing');
    if (e.target.id === 'ogDraftName' || e.target.id === 'ogMakeCommand') suggestClear();
    if (redrawing || e.target.id !== 'ogDraftName' || !goalsUi.draftingChapter) return;
    const chapterId = goalsUi.draftingChapter, name = e.target.value.trim();
    goalsUi.draftingChapter = null;
    if (name) { const why = draftEvent({ chapterId, name }); if (why) showToast(why); }
    redraw();
  });
  document.addEventListener('click', e => {
    if (!goalsUi.draftMenu || e.target.closest?.('[data-goals-action=draft-menu], .og-draft-menu')) return;
    goalsUi.draftMenu = null; redraw();
  });
}

function saveMakeSlice(root) {
  const why = makeDraftASlice({ chapterId: root.dataset.chapter, event: root.dataset.event, command: value('ogMakeCommand'), fields: value('ogMakeFields') });
  if (why) { showToast(why); return; }
  suggestClear();
  hideAllSheets();
  redraw();
  toastWithUndo('Slice made');
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
  else if (a === 'add-draft') { goalsUi.draftingChapter = t.dataset.chapter; goalsUi.draftMenu = null; redraw(); document.getElementById('ogDraftName')?.focus(); }
  else if (a === 'draft-menu') {
    const m = goalsUi.draftMenu, same = m && m.chapterId === t.dataset.chapter && m.name === t.dataset.name;
    goalsUi.draftMenu = same ? null : { chapterId: t.dataset.chapter, name: t.dataset.name }; redraw();
  }
  else if (a === 'drop-draft') { goalsUi.draftMenu = null; dropDraftEvent({ chapterId: t.dataset.chapter, name: t.dataset.name }); redraw(); }
  else if (a === 'make-slice') {
    const view = makeSliceSheet(projectState(), t.dataset.chapter, t.dataset.name);
    goalsUi.draftMenu = null; redraw();
    if (view) openBoardSheet(makeSliceForm(view), 'ogMakeCommand');
  }
  else if (a === 'cancel-make-slice') { suggestClear(); hideAllSheets(); }
  else if (a === 'save-make-slice') saveMakeSlice(t.closest('[data-component="Make slice sheet"]'));
  else if (a === 'toggle-ladder') { const s = goalsUi.ladderOpen; s.has(t.dataset.chapter) ? s.delete(t.dataset.chapter) : s.add(t.dataset.chapter); render(); }
}

// Enter saves what is being typed: a draft event's name, a criterion's words (Shift+Enter is a new line), a chapter's description
export function outlineGoalsKey(e) {
  if ((e.target.id === 'ogDraftName' || e.target.id === 'ogMakeCommand') && suggestKey(e)) return;
  if (e.key === 'Escape' && goalsUi.draftMenu) { goalsUi.draftMenu = null; redraw(); return; }
  if (e.key === 'Escape' && (goalsUi.draftingChapter || goalsUi.editingChapter) && e.target.closest('.og-brief, .og-drafts')) {
    goalsUi.draftingChapter = goalsUi.editingChapter = null; redraw(); return;
  }
  if (e.key !== 'Enter' || e.shiftKey) return;
  if (e.target.id === 'ogDraftName') { e.preventDefault(); saveDraft(goalsUi.draftingChapter); }
  else if (e.target.id === 'ogMakeCommand' || e.target.id === 'ogMakeFields') { e.preventDefault(); saveMakeSlice(e.target.closest('[data-component="Make slice sheet"]')); }
  else if (e.target.id === 'ogCritText') { e.preventDefault(); saveCriterion(e.target.closest('[data-component="Criterion sheet"]')); }
  else if (e.target.id === 'ogChapterDesc') { e.preventDefault(); saveDescription(goalsUi.editingChapter); }
}
