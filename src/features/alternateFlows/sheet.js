// ALTERNATE FLOWS - The chapter menu's "Put alternates in flows" tap. It reads nothing of the book itself (the command does the work).
import { hideAllSheets } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';
import { render } from '../../ui/feed.js';
import { toastWithUndo } from '../undo/command.js';
import { putAlternatesInFlows } from './alternateFlows.command.js';
import { ensureAlternateFlowsStyles } from './alternateFlows.styles.js';

ensureAlternateFlowsStyles();

// Taps in the board sheet that belong to this feature; true when handled
export function onSheetAction(a, t) {
  if (a !== 'alternate-flows') return false;
  const n = putAlternatesInFlows({ chapterId: t.dataset.chapter });
  hideAllSheets();
  render();
  if (n) toastWithUndo(`${n} alternate${n === 1 ? '' : 's'} put in flows`); else showToast('Nothing to put in a flow');
  return true;
}
