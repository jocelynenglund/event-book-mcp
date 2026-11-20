// ===========================================
// ARRANGE - Commands
// SC: Arrange Chapters — the whole order (and where each part starts) in one event. Dragging, a step earlier or later
//     and a move into a part are all this command with a different order. SC: Start Part, Rename Part, Remove Part.
// Each returns null when it recorded its event (or there was nothing to change), else why it was refused.
// ===========================================

import { appendEvent, getEventStream } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { newId } from '../board/command.js';
import { nickname } from '../comments/command.js';
import { arrangeChapters as decideArrange, startPart as decideStart, renamePart as decideRename, removePart as decideRemove } from './arrange.rules.js';
import { placeChapter, placePart, stepChapter as stepPlan, moveIntoPart } from './arrangePlace.rules.js';

const READ_ONLY = 'Read only: check the book out to arrange its chapters';

function record(r) {
  if (r.refused) return r.refused;
  return (r.events || []).every(e => appendEvent(e.type, e.data)) ? null : READ_ONLY;
}

export function arrangeChapters(order, parts = null) {
  return record(decideArrange(getEventStream(), { order, parts, arrangedBy: nickname() || 'someone' }));
}

const arrangePlan = plan => plan ? arrangeChapters(plan.order, plan.parts) : null;

// A chapter let go at a slot of the shelf (Arrange Slots)
export const dropChapter = (chapterId, slot) => arrangePlan(placeChapter(projectState(), chapterId, slot));
export const dropPart = (partId, slot) => arrangePlan(placePart(projectState(), partId, slot));
// One place earlier (-1) or later (1): the chapter's ⋮ and the Outline's ↑↓
export const stepChapter = (chapterId, by) => arrangePlan(stepPlan(projectState(), chapterId, by));
export const moveChapterIntoPart = (chapterId, partId) => arrangePlan(moveIntoPart(projectState(), chapterId, partId));

export const startPart = (firstChapter, name) => record(decideStart(getEventStream(), { partId: newId('part'), name, firstChapter }));
export const renamePart = (partId, name) => record(decideRename(getEventStream(), { partId, name }));
export const removePart = partId => record(decideRemove(getEventStream(), { partId }));
