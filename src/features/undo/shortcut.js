// ===========================================
// UNDO - Ctrl/Cmd+Z
// ===========================================
// One handler for every view: Ctrl/Cmd+Z takes back the last action, as ☰ → ↶ Undo and the toasts' Undo do.
// It stays out of the way of typing (a box keeps its own text undo, also with a sheet open), and of the Pad,
// which handles the key itself. There is no redo, so Shift+Z and Ctrl+Y are left alone.

import { undo } from './command.js';

export function initUndoShortcut() {
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z') return;
    if (e.defaultPrevented) return;
    if (document.getElementById('padView')?.offsetParent) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], .sheet-overlay.active')) return;
    e.preventDefault();
    undo();
  });
}
