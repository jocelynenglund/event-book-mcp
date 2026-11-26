// ===========================================
// PAD - Keyboard (SV: Pad Notes, Pad Frames)
// The keys on the Pad: Delete removes the selection, Escape clears it (or ends the typing), Enter ends the typing, Ctrl/Cmd+Z undoes,
// Space held lets a drag pan.
// ===========================================

import { suggestKey } from './suggestInput.js';
import { undo } from '../undo/command.js';
import { S, $, clearSelection, redraw } from './padScreenState.js';
import { endEdit, removeSelected } from './noteEditing.js';

export function onKey(e) {
  if (e.target.id === 'padBulkText' && suggestKey(e)) return;
  if (!document.getElementById('padView')?.offsetParent) return;
  const typing = e.target.matches?.('[data-pad-input]');
  if (typing) {
    if (e.target.matches('textarea') && suggestKey(e)) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endEdit({ cancel: true }); }
    else if (e.key === 'Enter' && (e.target.matches('input') || e.ctrlKey || e.metaKey)) { e.preventDefault(); endEdit(); }
    return;
  }
  if (e.target.closest?.('input, textarea, select, .sheet-overlay.active')) return;
  // Ctrl/Cmd+Z takes back the last action (a removed frame included), as ↶ Undo in the menu does; typing keeps its own undo
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (e.code === 'Space') { e.preventDefault(); S.spaceDown = true; $('padStage').dataset.space = 'true'; return; }   // hold Space and drag to pan
  if ((e.key === 'Delete' || e.key === 'Backspace') && (S.sel.noteIds.size || S.sel.frameIds.size)) { e.preventDefault(); removeSelected(); }
  else if (e.key === 'Escape' && (S.sel.noteIds.size || S.sel.frameIds.size)) { clearSelection(); redraw(); }
}

// Space is let go (or the window loses focus): a drag selects again
export function onSpaceUp(e) {
  if (!S.spaceDown || (e.type === 'keyup' && e.code !== 'Space')) return;
  if (e.type === 'keyup') e.preventDefault();
  S.spaceDown = false;
  delete $('padStage')?.dataset.space;
}
