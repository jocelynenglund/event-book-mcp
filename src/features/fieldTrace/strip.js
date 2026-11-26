// ===========================================
// FIELD TRACE - The strip at the bottom of the board and the Outline
// The board and the Outline draw it (drawTraceStrip) from the trace their draw read, and hide it when nothing is
// traced; any other screen hides it (hideTraceStrip). Tap a step: scroll to its sticky (the board) or its slice (the
// Outline); ✕ or Escape ends the trace. It draws from fieldTrace.parts.js.
// ===========================================

import { traceStrip } from './fieldTrace.parts.js';
import { endTrace, isTracing } from './traceState.js';
import { getView, render, showElementOnBoard } from '../../ui/feed.js';
import { isChapterFolded, toggleChapterFolded } from '../board/view.js';

export function drawTraceStrip(view) {
  const box = document.getElementById('traceStrip');
  if (!box) return;
  box.hidden = !view;
  box.innerHTML = view ? traceStrip(view) : '';
  document.body.classList.toggle('tracing', !!view);
}

export const hideTraceStrip = () => drawTraceStrip(null);

// A step of the strip: the board scrolls to the sticky and flashes it; the Outline to the slice's row
function showStep(elementId, sliceId, chapterId) {
  if (getView() === 'board') { showElementOnBoard(elementId, sliceId); return; }
  if (chapterId && isChapterFolded(chapterId)) { toggleChapterFolded(chapterId); render(); }
  const row = document.querySelector(`#outlineView [data-component="Outline row"][data-key="${sliceId}"]`);
  if (!row) return;
  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  row.classList.add('ol-flash');
  setTimeout(() => row.classList.remove('ol-flash'), 1400);
}

export function initTraceStrip() {
  document.getElementById('traceStrip')?.addEventListener('click', e => {
    const t = e.target.closest('[data-trace-action]');
    if (!t) return;
    if (t.dataset.traceAction === 'end') endTrace();
    else showStep(t.dataset.el, t.dataset.slice, t.dataset.chapter);
  });
  // Escape ends it, unless a sheet is open (Escape belongs to that)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isTracing() && !document.querySelector('.sheet-overlay.active')) endTrace();
  });
}
