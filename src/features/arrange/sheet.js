// ===========================================
// ARRANGE - Sheets: a part's menu, and the taps in a chapter's arrange options
// The chapter's menu (board/sheets/chapters.js) holds the arrange options; their taps are answered here.
// ===========================================

import { hideAllSheets } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';
import { render } from '../../ui/feed.js';
import { toastWithUndo } from '../undo/command.js';
import { openBoardSheet } from '../board/sheets/shared.js';
import { openChapterMenu } from '../board/sheets/chapters.js';
import { partMenuNow } from './partMenuFields.read.js';
import { partMenuBox } from './arrange.parts.js';
import { stepChapter, moveChapterIntoPart, startPart, renamePart, removePart } from './command.js';

export function openPartMenu(partId) {
  const v = partMenuNow(partId);
  if (v) openBoardSheet(partMenuBox(v));
}

// Done: close the sheet (or open the chapter's menu again, when a chapter was moved) and say so
function done(refused, message, chapterId = null) {
  if (refused) { showToast(refused); return; }
  render();
  if (chapterId) openChapterMenu(chapterId); else hideAllSheets();
  toastWithUndo(message);
}

// Taps in the board sheet that arrange; true when handled
export function onSheetAction(a, t) {
  const { chapter, part } = t.dataset;
  const typed = id => document.getElementById(id)?.value.trim() || '';
  if (a === 'arrange-step') done(stepChapter(chapter, Number(t.dataset.by)), 'Chapter moved', chapter);
  else if (a === 'arrange-into-part') done(moveChapterIntoPart(chapter, part), 'Chapter moved into the part', chapter);
  else if (a === 'start-part') {
    const name = typed('bdNewPart');
    if (!name) showToast('Give the part a name');
    else done(startPart(chapter, name), `Part "${name}" starts here`);
  }
  else if (a === 'rename-part') done(renamePart(part, typed('bdPartName')), 'Part renamed');
  else if (a === 'remove-part') done(removePart(part), 'Part removed, its chapters stay');
  else return false;
  return true;
}
