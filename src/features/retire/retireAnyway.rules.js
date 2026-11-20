// ===========================================
// RETIRE - SC: Retire Plan Anyway — the owner retires a plan on her word, whether some or none of its slices are
// marked built. PlanRetired { modelId, app, edition, retiredAt, byOwner: true, unconfirmed: [slice names] } (the same
// event the shelf, readyToRetire and the library already read). A plan waiting at the press leaves it first
// (PressStopped); one being built is refused. Pure over the plan's history: { events } or { refused }.
// ===========================================

import { projectState } from '../../core/projections.js';
import { readyToRetire } from './readyToRetire.read.js';
import { retireAnywayConfirm } from './retireAnywayConfirm.read.js';

export function retirePlanAnyway(history, { modelId = null, now = new Date().toISOString() } = {}) {
  const state = projectState(history);
  if (state.retired) return { refused: 'Already retired' };
  if (state.press?.stage === 'building') return { refused: `Being built by ${state.press.builder}: it can't be retired now` };
  const v = readyToRetire(history, modelId);
  const { unconfirmed } = retireAnywayConfirm(history, modelId);
  const events = [];
  if (state.press) events.push({ type: 'PressStopped', data: {} });
  events.push({ type: 'PlanRetired', data: { modelId, app: v.app, edition: v.edition, retiredAt: now, byOwner: true, unconfirmed } });
  return { events };
}
