// ===========================================
// PAD - Update chapter
// SC: Update Pad Chapter — a made frame's sketch changed since: carry the differences over to the slice Make chapter built (the preview of
// padUpdateChapter.read.js says them): a note whose title changed renames its sticky, a new note adds one, new fields go on the slice's
// stickies, a new red note becomes a comment, a new white note a description line and a new or edited grey scenario note a scenario. Nothing on the board is ever removed. The frame is
// recorded as made again (PadFrameConverted, with a fresh snapshot of what it was made from), so it stops saying "changed since".
// All one batch, so one undo takes it back. Returns { refused, changes }: refused says why nothing was done.
// ===========================================

import * as es from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import * as c from '../board/command.js';
import { addEventProperties } from '../outline/command.js';
import { eventFieldsOf } from './makeChapter.command.js';
import { addFields, addScenario, stickyNamed } from '../planFile/build.js';
import { addHotspotComment } from '../comments/command.js';
import { padMakeChapter } from './padMakeChapter.read.js';
import { padUpdateChapter } from './padUpdateChapter.read.js';
import { changedSince, madeOf, stickyTypeOf } from './padMade.rules.js';
import { placeScreens } from './screenSketch.command.js';
import { mapScreensOf } from './screenMappings.command.js';

const refuse = refused => ({ refused, changes: 0 });

export function updateChapter({ frameId }) {
  if (!es.canEditCurrent()) return refuse('Read only: check the book out to update a chapter');
  const state = projectState(), view = padUpdateChapter(state, { frameId });
  if (!view.available) return refuse(view.why);
  const frame = state.pad.frames[frameId];
  if (!view.steps.length && !changedSince(state.pad, frame)) return { refused: null, changes: 0 };
  try {
    const sliceId = view.sliceId;
    view.steps.filter(s => s.kind === 'rename').forEach(s => es.appendEvent(es.EventTypes.ElementRenamed, { elementId: s.elementId, name: s.to }));
    view.steps.filter(s => s.kind === 'add').forEach(s => {
      const elementId = c.addToSlice(sliceId, stickyTypeOf(s.role), stickyNamed(stickyTypeOf(s.role), s.name));
      if (s.storage && elementId) es.appendEvent(es.EventTypes.ElementStorageSet, { elementId, kind: s.storage.kind }); // feature: stored-elsewhere
      if (s.external && elementId) es.appendEvent(es.EventTypes.ElementExternalSet, { elementId, external: true });   // an event marked (external) is another system's
    });
    if (view.steps.some(s => s.kind === 'add' || s.kind === 'field') && view.fields.length) addFields(sliceId, view.fields);
    const refused = placeScreens(sliceId, view.steps.filter(s => s.kind === 'screen' || s.kind === 'sketch'));
    if (refused) throw new Error(refused);
    const mapped = mapScreensOf([sliceId]);   // a new input is mapped to the command, one taken out unmapped
    if (mapped) throw new Error(mapped);
    view.steps.filter(s => s.kind === 'scenario').forEach(s => addScenario(projectState().slices[sliceId], s.scenario));
    view.steps.filter(s => s.kind === 'comment').forEach(s => addHotspotComment(sliceId, s.text));
    const lines = view.steps.filter(s => s.kind === 'description').map(s => s.text);
    if (lines.length) c.describeSlice(sliceId, [projectState().slices[sliceId].description, ...lines].filter(Boolean).join('\n'));
    const after = projectState(), off = frame.made.off, slice = padMakeChapter(after, { frameIds: [frameId], off }).slices[0];
    if (slice.kind !== 'automation') addEventProperties(sliceId, eventFieldsOf(slice));   // a view frame's events keep the fields their notes say
    es.appendEvent(es.EventTypes.PadFrameConverted, { frameId, chapterId: frame.chapterId, sliceId, made: madeOf(after, after.pad.frames[frameId], slice, sliceId, off) });
    return { refused: null, changes: view.steps.length };
  } catch (e) { return refuse(e.message); }
}
