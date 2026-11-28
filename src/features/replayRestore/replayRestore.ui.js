// REPLAY RESTORE - the buttons in the Replay bar and the confirm sheet (feature: replay-restore)
// Replay hands over its bar and what it knows of the step shown; this draws from Restore Actions and runs the commands.

import { canEditCurrent } from '../../core/eventStore.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { openBoardSheet } from '../board/sheets/shared.js';
import { showToast } from '../../ui/toast.js';
import { render } from '../../ui/feed.js';
import { undo } from '../undo/command.js';
import { restoreActions } from './restoreActions.read.js';
import { restoreActionsBar, restoreConfirmSheet } from './replayRestore.parts.js';
import { restoreVersion, copyFromHere } from './replayRestore.command.js';
import { ensureReplayRestoreStyles } from './replayRestore.styles.js';

let ctx = null;      // { at, total, end, what, when, close } from Replay
let pending = null;  // what the confirm sheet will restore

export function mountRestore(bar, replay) {
  ensureReplayRestoreStyles();
  ctx = replay;
  const holder = document.createElement('div');
  holder.id = 'replayRestoreActions';
  bar.appendChild(holder);
  holder.addEventListener('click', e => {
    if (e.target.closest('[data-restore-version]')) ask();
    else if (e.target.closest('[data-copy-from-here]')) copy();
  });
  refreshRestore();
}

export function refreshRestore() {
  const holder = document.getElementById('replayRestoreActions');
  if (!holder || !ctx) return;
  holder.innerHTML = restoreActionsBar(restoreActions({ at: ctx.at(), total: ctx.total(), canEdit: canEditCurrent() }));
}

function ask() {
  if (!canEditCurrent()) { showToast('Read-only here: check it out to edit'); return; }
  const v = restoreActions({ at: ctx.at(), total: ctx.total(), canEdit: true });
  pending = { end: ctx.end(), what: ctx.what(), when: ctx.when(), name: ctx.name() };
  openBoardSheet(restoreConfirmSheet({ ...v, ...pending }));
}

function copy() {
  const { end, when } = { end: ctx.end(), when: ctx.when() };
  ctx.close();
  const name = copyFromHere(end, when || 'an earlier step');
  render();
  showToast(`Copied to a new book: ${name}`);
}

document.addEventListener('click', e => {
  const t = e.target.closest?.('[data-rr-confirm], [data-rr-cancel]');
  if (!t) return;
  hideAllSheets();
  if (t.hasAttribute('data-rr-cancel') || !pending) { pending = null; return; }
  const { end, what, when } = pending;
  pending = null;
  const done = restoreVersion(end);
  if (typeof done === 'string') { showToast(done); return; }
  ctx.close();
  showToast('Restored · the old version is saved as a copy', { action: 'Undo', onAction: undo });
});
