// ===========================================
// STAGE FILTER NOTE (SV) - whether a stage filter is on, and which: the Outline says so under its search box,
// because a choice remembered from the board's bottom bar can be on with no control in sight.
// ===========================================

import { stages, active } from './stage.js';

// The stage filter must have been told the book (filterFor), as the outline layout does before drawing
export function stageFilterNote() {
  const on = active();
  if (on === 'all') return { on: false, key: '', label: '' };
  const label = (stages().find(([k]) => k === on) || [])[1] || on;
  return { on: true, key: on, label };
}
