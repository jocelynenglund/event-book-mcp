// ===========================================
// BOARD - Sheets & interactions
// Each sheet lives in ./sheets/; this wires the board's taps and the sheet's.
// ===========================================

import { projectState } from '../../core/projections.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { render, showSlicePage } from '../../ui/feed.js';
import { isReadOnly, openElementReadSheet } from '../readOnly/sheet.js';
import { openElementMenu } from '../elementMenu/sheet.js';
import { openPropertySheet } from '../properties/sheet.js';
import { startTrace } from '../fieldTrace/traceState.js';
import { moveSlice, setUpdateRole } from './command.js';
import { openReplay } from '../replay/replay.js';
import { toggleChapterFolded, setAllChaptersFolded, isChapterFolded, toggleGwtLane, showFlow } from './view.js';
import { scrollToSlice } from './sheets/shared.js';
import { openNewSliceSheet, onSheetAction as newSliceAction } from './sheets/newSlice.js';
import { openChapterMenu, openChapterPicker, onSheetAction as chapterAction } from './sheets/chapters.js';
import { onSheetAction as readSheetAction } from '../readOnly/sheet.js';
import { openCellSheet, onSheetAction as cellAction } from './sheets/cell.js';
import { openEventsSheet, openPlacesSheet, onSheetAction as eventsAction } from './sheets/events.js';
import { openScenariosSheet, onSheetAction as scenariosAction } from './sheets/scenarios.js';
import { openModelNameSheet, openSliceInfo, openSliceMenu, onSheetAction as sliceMenuAction } from './sheets/sliceMenu.js';
import { onSheetAction as processorAction } from './sheets/processor.js';
import { onSheetAction as cloneSliceAction } from '../cloneSlice/sheet.js'; // feature: clone-slice
import { onSheetAction as storedElsewhereAction } from '../storedElsewhere/sheet.js'; // feature: stored-elsewhere
import { onSheetAction as modelMdAction } from '../modelMd/sheet.js'; // feature: model-md
import { openFindSheet, onSheetAction as findAction, onSheetInput as findInput } from './sheets/find.js';
import { openReferencePicker } from '../references/sheet.js';
import { onFieldTap, onCountTap, onSheetAction as fieldGapAction } from '../fieldSources/sheet.js';
import { onSheetAction as fieldMapAction, onSheetInput as fieldMapInput } from '../fieldMapping/sheet.js';
import { openPartMenu, onSheetAction as arrangeAction } from '../arrange/sheet.js';
import { togglePartFolded } from '../arrange/partFolds.js';
import { canArrangeCurrent } from '../../core/eventStore.js';

export { openNewSliceSheet } from './sheets/newSlice.js';
export { openChapterPicker, openChapterMenu } from './sheets/chapters.js';
export { openCellSheet } from './sheets/cell.js';
export { openSliceMenu, openReorderSheet, openModelNameSheet } from './sheets/sliceMenu.js';
export { openUpdatedByPicker, openProcessorInputs } from './sheets/processor.js';
import { openThread, openCommentsList } from '../comments/sheet.js';
import { isLiterature } from '../literature/rules.js';
import { revealInBook } from '../literature/view.js';
import { canAddScenariosHere } from '../review/client.js';
import { openProgressHistory } from '../buildProgress/sheet.js';

// ---------- Wiring ----------

function handleBoardClick(e) {
  const t = e.target.closest('[data-action]');
  // A tap on a grip is only a grip: it opens what the grip sits on (a spine), but not the buttons a grip carries (a part tab's)
  if (!t || t.contains(e.target.closest('.bd-grip'))) return;
  const { action, slice, el, to } = t.dataset;
  // A field chip on a card goes straight to that field: its property sheet (Trace, Comes from…), or the trace when the book can't be changed here
  if (action === 'field-trace') { startTrace(el, t.dataset.fieldName); return; }
  if (action === 'field') {
    const prop = projectState().elements[el]?.properties?.find(p => p.name === t.dataset.fieldName);
    if (!prop) startTrace(el, t.dataset.fieldName); else openPropertySheet(el, prop.id);
    return;
  }
  if (isReadOnly() && !(action === 'part-menu' && canArrangeCurrent()) && readOnlyTap(action, t)) return;
  if (action === 'new-slice') openNewSliceSheet(t.dataset.chapter || undefined);
  else if (action === 'chapter-menu') openChapterMenu(t.dataset.chapter);
  else if (action === 'fold') {
    const opening = isChapterFolded(t.dataset.chapter);
    toggleChapterFolded(t.dataset.chapter);
    if (opening) {
      // Bring the chapter's first slice into view as it opens
      const state = projectState();
      const first = state.sliceOrder.find(id => state.slices[id]?.chapterId === t.dataset.chapter);
      if (first) scrollToSlice(first);
    }
  }
  else if (action === 'part-menu') openPartMenu(t.dataset.part);
  else if (action === 'fold-part') { togglePartFolded(t.dataset.part); render(); }
  else if (action === 'insert') {
    openNewSliceSheet(undefined, t.dataset.before ? { before: t.dataset.before } : { after: t.dataset.after });
  }
  else if (action === 'add') openCellSheet(slice, t.dataset.laneType);
  else if (action === 'events') openEventsSheet(slice);
  else if (action === 'givens') openEventsSheet(slice, { givens: true });
  else if (action === 'gwt-drawer') openScenariosSheet(slice);
  else if (action === 'element-read') {
    // A to-do list's update tag flips between adding an item and ticking one off
    const flip = e.target.closest('[data-flip]');
    if (flip) {
      setUpdateRole(flip.dataset.flip, el, flip.dataset.role === 'completes' ? 'adds' : 'completes');
      render();
      return;
    }
    // A processor's "reads <view slice>" tag goes to that slice
    const goto = e.target.closest('[data-goto-slice]');
    if (goto) { scrollToSlice(goto.dataset.gotoSlice); return; }
    // Tap reads (a field too); the ⋮ on the card is the editor
    openElementReadSheet(el, slice);
  }
  else if (action === 'places') openPlacesSheet(el, slice);
  else if (action === 'element') openElementMenu(el, slice);
  else if (action === 'field-gap') onFieldTap(el, slice, t.dataset.field);
  else if (action === 'fix-list') onCountTap(t);
  else if (action === 'slice-menu') openSliceMenu(slice);
  else if (action === 'slice-page') showSlicePage(slice);
  else if (action === 'progress-history') openProgressHistory(slice);
  else if (action === 'slice-info') openSliceInfo(slice);
  else if (action === 'toggle-gwt') toggleGwtLane();
  else if (action === 'comment') openThread(slice, t.dataset.scenario || null);
  else if (action === 'next-comment') openCommentsList(revealComment);
  else if (action === 'show-flow') showFlow(t.dataset.chapter, t.dataset.flow || null);
  else if (action === 'scenario') window.EventPad.editScenario(t.dataset.scenario);
  else if (action === 'add-scenario') {
    const s = projectState().slices[slice];
    if (s) window.EventPad.addScenario(s.id, s.type);
  }
  else if (action === 'move') {
    if (moveSlice(slice, to)) { render(); scrollToSlice(slice); }
  }
}

// Not checked out here: a tap reads (a sticky's sheet, the slice page, the scenarios);
// what would change the model does nothing. Folding, flows and ⓘ are left to the board.
const readOnlyReads = new Set(['field-gap', 'fix-list', 'chapter-menu', 'fold', 'fold-part', 'show-flow', 'toggle-gwt', 'slice-info', 'slice-page', 'progress-history', 'comment', 'next-comment']);
function readOnlyTap(action, t) {
  const { slice, el } = t.dataset;
  if (readOnlyReads.has(action)) return false;
  if (action === 'element' || action === 'element-read') openElementReadSheet(el, slice);
  else if (action === 'places') openPlacesSheet(el, slice);
  else if (action === 'slice-menu') openSliceMenu(slice);   // only sharing
  else if (action === 'events') openEventsSheet(slice, { readOnly: true });
  else if (action === 'givens') openEventsSheet(slice, { readOnly: true, givens: true });
  else if (action === 'gwt-drawer') openScenariosSheet(slice, { readOnly: !canAddScenariosHere() });
  else if (action === 'scenario') {
    const scn = projectState().scenarios[t.dataset.scenario];
    if (scn) openScenariosSheet(scn.sliceId, { readOnly: !canAddScenariosHere() });
  }
  return true;
}

// A comment picked in the drawer: unfold its chapter, scroll the lane to it and flash it
function revealComment(c) {
  if (isLiterature(projectState())) { revealInBook(c); return; }   // a literature book has no stickies: its Read / Outline
  const chapterId = projectState().slices[c.sliceId]?.chapterId;
  if (chapterId && isChapterFolded(chapterId)) { toggleChapterFolded(chapterId); render(); }
  const el = document.querySelector(`.bd-cm[data-cm-anchor="${c.commentId}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1400);
}

// Taps inside the board sheet: each sheet module answers its own
const sheetActions = [readSheetAction, newSliceAction, chapterAction, arrangeAction, cellAction, eventsAction, scenariosAction, sliceMenuAction, processorAction, findAction, fieldGapAction, fieldMapAction,
  cloneSliceAction, // feature: clone-slice
  storedElsewhereAction, // feature: stored-elsewhere
  modelMdAction, // feature: model-md
];

function handleSheetClick(e) {
  const t = e.target.closest('[data-board-action]');
  if (!t) return;
  const a = t.dataset.boardAction;
  if (a === 'close') { hideAllSheets(); return; }
  sheetActions.some(handle => handle(a, t));
}

// ---------- Floating + ----------

export function toggleFabMenu(open) {
  const menu = document.getElementById('fabMenu');
  const isOpen = open ?? !menu.classList.contains('open');
  menu.classList.toggle('open', isOpen);
  document.getElementById('fab').classList.toggle('open', isOpen);
}

function handleFabMenu(e) {
  const t = e.target.closest('[data-fab]');
  if (!t) return;
  toggleFabMenu(false);
  // A slice from here starts outside any chapter; the sheet's chips can still pick one
  if (t.dataset.fab === 'slice') openNewSliceSheet(null);
  else if (t.dataset.fab === 'reference') openReferencePicker();
  else openChapterPicker(null);
}

export function initBoard() {
  document.getElementById('fabMenu').addEventListener('click', handleFabMenu);
  document.addEventListener('click', e => {
    if (!e.target.closest('#fab, #fabMenu')) toggleFabMenu(false);
  });
  document.getElementById('board').addEventListener('click', handleBoardClick);
  // Enter on a focused field chip (or its ⤳ Trace) does what a tap does
  document.getElementById('board').addEventListener('keydown', e => {
    const t = e.target.closest?.('[data-action="field"], [data-action="field-trace"]');
    if (t && e.key === 'Enter' && e.target === t) { e.preventDefault(); t.click(); }
  });
  document.getElementById('boardStats')?.addEventListener('click', e => {
    if (e.target.closest('[data-find-open]')) { openFindSheet(); return; }
    if (e.target.closest('[data-replay]')) { openReplay(); return; }
    if (e.target.closest('[data-comments-open]')) { openCommentsList(revealComment); return; }
    const t = e.target.closest('[data-fold-all]');
    if (!t) return;
    const state = projectState();
    setAllChaptersFolded(state.chapterOrder, t.dataset.foldAll === 'close');
    render();
    document.getElementById('board')?.scrollTo({ left: 0 });
  });
  document.getElementById('boardSheetContent').addEventListener('click', handleSheetClick);
  document.getElementById('boardSheetContent').addEventListener('input', e => { findInput(e); fieldMapInput(e); });
  // An untitled model's title asks for a name; once it has one, renaming is in the
  // library (the shelf's ⋯ → Name & description). In the library it just says eventPAD.
  document.getElementById('modelTitle').addEventListener('click', () => {
    if (!document.body.classList.contains('library-mode') && !isReadOnly() && !projectState().modelName) openModelNameSheet();
  });
}
