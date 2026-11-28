// REPLAY RESTORE - Parts, each drawn from its view alone (feature: replay-restore)
//   Restore actions: two buttons under the Replay bar's info, "Restore this version" and "Copy from here" (read-only books get only the copy)
//   Restore confirm sheet: what is restored, how many later actions go, and the way back

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const restoreActionsBar = v => v.atNow ? '' : `
    <div class="rr-actions" data-component="Restore actions" data-key="replay">
      ${v.canRestore ? '<button class="sheet-btn rr-restore" data-restore-version>Restore this version</button>' : ''}
      ${v.canCopy ? '<button class="sheet-btn secondary rr-copy" data-copy-from-here>Copy from here</button>' : ''}
    </div>`;

export const restoreConfirmSheet = v => `
    <div class="rr-sheet" data-component="Restore confirm sheet" data-key="replay">
      <div class="sheet-title">Restore this version?</div>
      <p class="sy-p">Go back to “${escapeHtml(v.what)}”${v.when ? ` (${escapeHtml(v.when)})` : ''}? ${v.later} later change${v.later === 1 ? ' is' : 's are'} taken back. A copy of the book as it is now is saved as “${escapeHtml(v.name)} · before restore …”. ↶ Undo also brings ${v.later === 1 ? 'it' : 'them'} back until you change something else.</p>
      <button class="sheet-btn" data-rr-confirm>Restore</button>
      <button class="sheet-btn secondary" data-rr-cancel>Cancel</button>
    </div>`;
