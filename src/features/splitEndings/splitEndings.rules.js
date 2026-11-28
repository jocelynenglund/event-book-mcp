// SPLIT ENDINGS - Shared pure rules
// One command, one event: a command that can end in success OR failure is drawn, in classic event modeling, as one slice per outcome.
// A Do slice (a change, or an automation's command half) whose command shows 2+ outcome events looks like several endings drawn on one slice,
// unless some scenario's Then names more than one of them (none can: a Then names one event, so in practice 2+ outcomes is the trigger).
// A view may read many events: never hinted.
import { getScenariosForSlice, sliceTitle } from '../../core/projections.js';

const thenIds = scn => (scn.then?.type === 'event' && scn.then.eventId ? [scn.then.eventId] : []);

// The outcome events of a change slice, in the order they are drawn (external events and events stored elsewhere are not outcomes)
export const outcomesOf = (state, slice) => slice?.type === 'SC'
  ? slice.elements.map(id => state.elements[id]).filter(e => e?.type === 'event' && !e.external && !e.storage) : [];

// The outcomes that look like alternate endings, or null when the slice is fine: a command, 2+ outcomes, and every scenario names at most one of them
export function endingsOf(state, slice) {
  if (!slice || !slice.elements.some(id => state.elements[id]?.type === 'command')) return null;
  const outs = outcomesOf(state, slice);
  if (outs.length < 2) return null;
  const ids = new Set(outs.map(e => e.id));
  return getScenariosForSlice(slice.id, state).every(s => thenIds(s).filter(id => ids.has(id)).length <= 1) ? outs : null;
}

// "A and B", "A, B and C"
export const listNames = els => els.length < 3 ? els.map(e => e.name).join(' and ') : `${els.slice(0, -1).map(e => e.name).join(', ')} and ${els[els.length - 1].name}`;

export const gapWords = (state, slice, outs) => `${sliceTitle(slice, state)}: ${listNames(outs)} look like alternate outcomes — one command, one event`;
export const FIX_LABEL = 'Split into endings';
export const fixId = sliceId => `splitendings|${sliceId}`;

// The outcome the original keeps: the one most scenarios end in; ties go to the first drawn
export function keptOutcome(state, slice, outs) {
  const scns = getScenariosForSlice(slice.id, state);
  const count = e => scns.filter(s => thenIds(s).includes(e.id)).length;
  return outs.reduce((best, e) => (count(e) > count(best) ? e : best), outs[0]);
}

// The completeness gap (called by fieldSources/rules.js once per slice with its own gap function)
export function endingsGap(state, slice, commands, gap) {
  const outs = endingsOf(state, slice);
  if (!outs) return;
  gap(commands[0], '(the event)', gapWords(state, slice, outs), FIX_LABEL, 'endings', { from: outs, fixes: [{ id: fixId(slice.id), kind: 'splitendings', label: FIX_LABEL }] });
}
