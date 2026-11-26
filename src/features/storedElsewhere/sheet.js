// ===========================================
// STORED ELSEWHERE - The "Stored as…" sheet (an event sticky's ⋮ → Stored as…): kind, name, Save / Clear.
// It draws from Stored As Choices and reads nothing of the book itself; the command is in storedElsewhere.command.js.
// ===========================================

import { hideAllSheets } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';
import { render } from '../../ui/feed.js';
import { toastWithUndo } from '../undo/command.js';
import { openBoardSheet } from '../board/sheets/shared.js';
import { getCurrentMenuElementId } from '../elementMenu/sheet.js';
import { storedAsChoicesNow } from './storedAsChoices.read.js';
import { storedAsSheet } from './storedElsewhere.parts.js';
import { setStoredElsewhere } from './storedElsewhere.command.js';
import { ensureStoredElsewhereStyles } from './storedElsewhere.styles.js';

ensureStoredElsewhereStyles();

// The element menu's "Stored as…" (EventPad.menuStoredAs): the menu closes, the sheet opens for that sticky
export function openStoredAs(elementId) {
  const choices = storedAsChoicesNow(elementId);
  if (!choices) { showToast('That sticky is gone'); return; }
  hideAllSheets();
  setTimeout(() => openBoardSheet(storedAsSheet(choices), 'seKind'), 120);
}

// The ⋮ menu's "Stored as…" runs EventPad.menuStoredAs
export const menuStoredAs = () => openStoredAs(getCurrentMenuElementId());

function save(t, clear) {
  const box = t.closest('[data-component="Stored as sheet"]');
  if (!box) return;
  const kind = clear ? '' : box.querySelector('#seKind')?.value ?? '';
  const name = clear ? '' : box.querySelector('#seName')?.value ?? '';
  if (!clear && !kind.trim()) { showToast('Say what it is stored as, or Clear'); return; }
  const done = setStoredElsewhere({ elementId: box.dataset.el, kind, name });
  if (typeof done === 'string') { showToast(done); return; }
  hideAllSheets();
  render();
  if (done.changed) toastWithUndo(done.storage ? 'Stored elsewhere' : 'A plain event again');
}

// Taps in the board sheet that belong to this feature; true when handled
export function onSheetAction(a, t) {
  if (a === 'stored-save') save(t, false);
  else if (a === 'stored-clear') save(t, true);
  else if (a === 'stored-kind') { const input = t.closest('[data-component="Stored as sheet"]')?.querySelector('#seKind'); if (input) { input.value = t.dataset.kind; input.focus(); } }
  else return false;
  return true;
}
