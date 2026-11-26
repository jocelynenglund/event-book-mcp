// ===========================================
// PAD - Make chapter
// SC: Make Pad Chapter — the selected frames become a chapter of the book's board, one slice each, built with the same
// steps the plan files and the agent tools use (planFile/build.js), then each frame is marked "→ in chapter X"
// (PadFrameConverted, with the slice and a snapshot of what it was made from, so a later change to the sketch can be told: see padMade.rules.js). The notes stay as the sketch. It is all one batch, so one undo takes the chapter back. A command slice's
// fields go on its command and its events, a field's "(…)" note in the slice's description (a field has none of its own), as does each
// white note (an automation frame is an auto step: a processor that reads its read model, then a command or the event it translates into); each red note (a hotspot) becomes an open comment on the slice, and each grey scenario note a scenario on it (padScenario.rules.js).
// A screen note becomes ONE screen sticky (by name) in every slice it is placed in (padMakeScreens.rules.js), carrying its wireframe text (ScreenSketchSet); its inputs are fields of the command, mapped from the screen (command.input ← screen.input), and the fields of each { Read Model } it shows are mapped onto it (screenMappings.rules.js).
// Returns { refused, chapterId, slices }: refused says why nothing was made.
// ===========================================

import { appendEvent, EventTypes, canEditCurrent } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { addEventProperties, addElementProperties } from '../outline/command.js';
import { addStep, addScenario, chapterId as chapterNamed } from '../planFile/build.js';
import { addHotspotComment } from '../comments/command.js';
import { padMakeChapter } from './padMakeChapter.read.js';
import { madeOf, ownFieldLines } from './padMade.rules.js';
import { placeScreens } from './screenSketch.command.js';
import { mapScreensOf } from './screenMappings.command.js';
import { notesInFrame } from './sketch.js';

const refuse = refused => ({ refused, chapterId: null, slices: 0 });

// A slice of the preview as a plan-file step (what the ticked lines say)
export function stepOf(slice) {
  const kept = slice.lines.filter(l => l.included);
  const events = kept.filter(l => l.role === 'event' && !l.trigger).map(l => (l.external || l.storage ? { name: l.name, ...(l.external ? { external: true } : {}), ...(l.storage ? { storage: l.storage } : {}) } : l.name));   // an event marked (external) is another system's
  const fields = [...new Map(ownFieldLines(kept).map(l => [l.name.toLowerCase(), l.type ? `${l.name}:${l.type}` : l.name])).values()];   // "amount: number" keeps its type
  if (slice.kind === 'automation') return autoStepOf(slice, kept.find(l => l.role === 'automation').automation, events, fields, kept.find(l => l.role === 'event' && l.trigger));
  const notes = [...kept.filter(l => l.role === 'field' && l.note).map(l => `${l.name}: ${l.note}`), ...kept.filter(l => l.role === 'note').map(l => l.text)];
  const main = kept.find(l => l.role === 'command' || l.role === 'view');
  return {
    kind: slice.kind === 'command' ? 'do' : 'see', name: slice.name || undefined,
    ...(slice.kind === 'command' ? { command: main.name } : { readModel: main.name }),
    events, ...(fields.length ? { fields } : {}), ...(notes.length ? { description: notes.join('\n') } : {})
  };
}

// An automation frame as a plan-file auto step: its processor reads the read model, then triggers the command, or translates into the event (with the frame's other events)
// Its trigger is the event it wakes on (an external or earlier event: `when`). A command's fields stay on the command, and each event keeps the fields its own note lists
function autoStepOf(slice, auto, events, fields, trigger) {
  const results = auto.targetKind === 'event' ? [...new Map([auto.target, ...events].map(e => [e.name ?? e, e])).values()] : events;
  return {
    kind: 'auto', name: slice.name || undefined, processor: auto.name, using: auto.reads,
    ...(auto.targetKind === 'command' ? { command: auto.target } : {}), ...(trigger ? { when: trigger.external ? { name: trigger.name, external: true } : trigger.name } : {}),
    ...(results.length ? { events: results } : {}), ...(fields.length && auto.targetKind !== 'command' ? { fields } : {})
  };
}

// An automation's command: the fields its note lists (they go on the command only)
export function commandFieldsOf(slice) {
  const kept = slice.lines.filter(l => l.included), command = kept.find(l => l.role === 'command');
  return command ? [...new Map(kept.filter(l => l.role === 'field' && l.noteId === command.noteId).map(l => [l.name.toLowerCase(), l.type ? `${l.name}:${l.type}` : l.name])).values()] : [];
}

// What a view frame's orange notes say about their events: the fields each was drawn with (a step's fields are its own note's: ownFieldLines)
export function eventFieldsOf(slice) {
  const kept = slice.lines.filter(l => l.included);
  const by = new Map();   // an event on two notes (the note and its linked copy) is one event: its fields once
  kept.filter(l => l.role === 'event').forEach(e => {
    const have = by.get(e.name.toLowerCase()) || { name: e.name, fields: [] };
    kept.filter(l => l.role === 'field' && l.noteId === e.noteId).forEach(l => { if (!have.fields.some(f => f.split(':')[0].toLowerCase() === l.name.toLowerCase())) have.fields.push(l.type ? `${l.name}:${l.type}` : l.name); });
    by.set(e.name.toLowerCase(), have);
  });
  return [...by.values()].filter(e => e.fields.length);
}

// The frames in the order they are made: an automation whose read model is a view made later in this batch waits for it (and then links to it)
export function makeOrder(slices) {
  const view = slice => slice.lines.find(l => l.role === 'view')?.name.toLowerCase();
  const reads = slice => slice.lines.find(l => l.role === 'automation')?.automation.reads?.toLowerCase();
  const waiting = [], ordered = [];
  slices.forEach((slice, i) => {
    if (slice.kind === 'automation' && slices.slice(i + 1).some(s => view(s) && view(s) === reads(slice))) { waiting.push(slice); return; }
    ordered.push(slice);
    waiting.filter(a => view(slice) && view(slice) === reads(a)).forEach(a => { ordered.push(a); waiting.splice(waiting.indexOf(a), 1); });
  });
  return ordered;
}

// shelve: each made frame goes on the shelf at once (the Make chapter sheet ticks it): the Pad draws less (shelf.command.js)
export function makeChapter({ frameIds = [], chapterName = '', names = {}, off = [], shelve = false }) {
  if (!canEditCurrent()) return refuse('Read only: check the book out to make a chapter');
  const state = projectState();
  if (!frameIds.some(id => state.pad.frames[id])) return refuse('Select a frame first');
  if (!String(chapterName).trim()) return refuse('Name the chapter');
  const made = makeOrder(padMakeChapter(state, { frameIds, chapterName, names, off }).slices.filter(s => s.kind));
  if (!made.length) return refuse('None of these frames has a blue command or a green view to make a slice from');
  try {
    const chapterId = chapterNamed(String(chapterName).trim());
    const sliceIds = made.map(slice => {
      const sliceId = addStep(stepOf(slice), chapterId);
      if (slice.kind === 'automation') {   // the command's fields on the command, the events' own on the events: nothing is copied between them
        const command = slice.lines.find(l => l.included && l.role === 'command');
        if (command) addElementProperties(sliceId, 'command', [{ name: command.name, fields: commandFieldsOf(slice) }]);
      }
      addEventProperties(sliceId, eventFieldsOf(slice));
      const refused = placeScreens(sliceId, slice.lines.filter(l => l.included && l.role === 'screen').map(l => ({ name: l.name, text: l.screenText })));
      if (refused) throw new Error(refused);
      slice.lines.filter(l => l.included && l.role === 'hotspot').forEach(l => addHotspotComment(sliceId, l.text));
      slice.lines.filter(l => l.included && l.role === 'scenario').forEach(l => addScenario(projectState().slices[sliceId], l.scenario));
      return sliceId;
    });
    const mapped = mapScreensOf(sliceIds);   // the screens' inputs and shown fields, once every slice is there
    if (mapped) throw new Error(mapped);
    const now = projectState();
    made.forEach((slice, i) => appendEvent(EventTypes.PadFrameConverted, { frameId: slice.frameId, chapterId, sliceId: sliceIds[i], made: madeOf(now, now.pad.frames[slice.frameId], slice, sliceIds[i], off) }));
    if (shelve) made.forEach(slice => appendEvent(EventTypes.PadFrameShelved, { frameId: slice.frameId, noteIds: notesInFrame(now.pad, now.pad.frames[slice.frameId]).map(n => n.id) }));
    return { refused: null, chapterId, slices: made.length };
  } catch (e) { return refuse(e.message); }
}
