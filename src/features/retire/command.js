// ===========================================
// RETIRE - Commands
// SC: Retire Plan — the open plan, when every slice is built. Returns why it was refused, or null.
// ===========================================

import { appendEvent, getEventStream, getCurrentModelId } from '../../core/eventStore.js';
import { retirePlan as decide } from './rules.js';
import { retirePlanAnyway as decideAnyway } from './retireAnyway.rules.js';

export function retirePlan() {
  const r = decide(getEventStream(), { modelId: getCurrentModelId() });
  if (r.refused) return r.refused;
  return r.events.every(e => appendEvent(e.type, e.data)) ? null : 'Read only';
}

// SC: Retire Plan Anyway — the owner's word (see retireAnyway.rules.js). Returns why it was refused, or null.
export function retirePlanAnyway() {
  const r = decideAnyway(getEventStream(), { modelId: getCurrentModelId() });
  if (r.refused) return r.refused;
  return r.events.every(e => appendEvent(e.type, e.data)) ? null : 'Read only';
}
