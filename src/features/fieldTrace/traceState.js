// ===========================================
// FIELD TRACE - Which field is traced (this device's, not the book's)
// A trace follows one field through the board or the Outline until it is ended (✕, Escape, or the field going away).
// Nothing is recorded: it is a way of looking. startTrace shows the board when it is started from somewhere else.
// ===========================================

import { render, getView, getOverviewTab, showBoard } from '../../ui/feed.js';
import { fieldTrace } from './fieldTrace.read.js';

let at = null;   // { elementId, field }

export const isTracing = () => !!at;

export function startTrace(elementId, field) {
  at = { elementId, field };
  const here = getView() === 'board' || (getView() === 'details' && getOverviewTab() === 'outline');
  if (here) render(); else showBoard();
}

export function endTrace() {
  if (!at) return;
  at = null;
  render();
}

// The trace being followed, read from the book a screen has just replayed (null when none, or its field is gone)
export function activeFieldTrace(state) {
  if (!at) return null;
  const view = fieldTrace(state, at);
  if (!view) at = null;
  return view;
}
