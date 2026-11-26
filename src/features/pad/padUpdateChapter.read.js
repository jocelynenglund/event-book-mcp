// ===========================================
// PAD - Update chapter preview (SV: Pad Update Chapter)
// What Update chapter will do to a frame's slice on the board, before it does it: the frame as it is now (read as Make chapter reads it,
// with the lines that were unticked then still unticked) set against what the chapter was made from (padMade.rules.js).
//   renames: a command / view / event note whose title changed renames its sticky (the same sticky, not a new one);
//   adds: a note that is new to the frame adds a sticky, a new field goes on the slice's stickies, a new red note becomes a comment,
//         a new white note a description line;
//   a screen note that is new adds its screen (the one sticky of that name) with its sketch, one whose text changed gives the sticky its new sketch (its inputs are fields like any);
//   a scenario note that is new, or whose text changed, adds its scenario (the earlier one stays: a changed note adds its new version);
//   notRemoved: what the sketch no longer has but the board keeps (nothing on the board is ever deleted);
//   notChanged: what can not be carried over (a slice has one command or one view).
// `steps` are what the command does; `changes` the same in words. Not available when the frame was not made (or before it was recorded),
// or its chapter or slice is gone.
// ===========================================

import { padMakeChapter } from './padMakeChapter.read.js';
import { stickyTypeOf, lower, ownFieldLines } from './padMade.rules.js';
import { scenarioLines } from './padScenario.rules.js';

const NOT_MADE = 'This frame was not made into a chapter, or was made before changes could be followed';
const GONE = 'The chapter or its slice is gone from the board';
const ROLE_WORD = { command: 'command', view: 'view', event: 'event' };
const out = (frameId, why) => ({ frameId, available: false, why, chapterName: '', sliceName: '', sliceId: null, steps: [], changes: [], notRemoved: [], notChanged: [], fields: [], canUpdate: false });

export function padUpdateChapter(state, { frameId }) {
  const frame = state.pad?.frames[frameId], made = frame?.made;
  if (!made) return out(frameId, NOT_MADE);
  const chapter = state.chapters[frame.chapterId], slice = state.slices[frame.sliceId];
  if (!chapter || !slice) return out(frameId, GONE);
  const fresh = padMakeChapter(state, { frameIds: [frameId], off: made.off }).slices[0];
  if (!fresh?.kind) return out(frameId, 'The frame has no blue command or green view note now');

  const lines = fresh.lines.filter(l => l.included), onSlice = slice.elements.map(id => state.elements[id]).filter(Boolean);
  const steps = [], notRemoved = [], notChanged = [], kept = new Set();
  const key = (noteId, role) => `${noteId}|${role}`;

  lines.filter(l => ROLE_WORD[l.role]).forEach(l => {
    const was = made.stickies.find(s => s.noteId === l.noteId && s.role === l.role), el = was && state.elements[was.elementId];
    const type = stickyTypeOf(l.role), here = onSlice.some(e => e.type === type && lower(e.name) === lower(l.name));
    if (el && lower(el.name) === lower(l.name)) { kept.add(key(l.noteId, l.role)); return; }
    if (el && !here && !Object.values(state.elements).some(e => e.id !== el.id && e.type === type && lower(e.name) === lower(l.name))) {
      kept.add(key(l.noteId, l.role));
      const shared = Object.entries(state.slices).filter(([id, s]) => id !== frame.sliceId && s.elements.includes(el.id)).length;
      steps.push({ kind: 'rename', role: l.role, elementId: el.id, from: el.name, to: l.name, shared });
    } else if (l.role === 'event') { if (!here) steps.push({ kind: 'add', role: l.role, name: l.name, ...(l.external ? { external: true } : {}), ...(l.storage ? { storage: l.storage } : {}) }); }
    else if (!here) notChanged.push(`${ROLE_WORD[l.role]} ${l.name} (a slice has one command or view)`);
  });
  made.stickies.filter(s => state.elements[s.elementId] && !kept.has(key(s.noteId, s.role))).forEach(s => notRemoved.push(`${ROLE_WORD[s.role]} ${state.elements[s.elementId].name}`));

  const fields = [...new Map(ownFieldLines(lines).map(l => [lower(l.name), l.name])).values()];
  const had = new Set(made.fields.map(lower)), have = new Set(fields.map(lower));
  fields.filter(n => !had.has(lower(n))).forEach(name => steps.push({ kind: 'field', name }));
  made.fields.filter(n => !have.has(lower(n))).forEach(n => notRemoved.push(`field ${n}`));

  // A screen: a new one is added to the slice, one whose sketch changed gets its new sketch (the same sticky is in other slices too)
  const screens = lines.filter(l => l.role === 'screen'), wasScreens = made.screens || [];
  screens.forEach(l => {
    const was = wasScreens.find(m => m.noteId === l.noteId && lower(m.name) === lower(l.name));
    if (!was) steps.push({ kind: 'screen', name: l.name, text: l.screenText });
    else if (was.text !== l.screenText) steps.push({ kind: 'sketch', name: l.name, text: l.screenText });
  });
  wasScreens.filter(m => !m.implied && !screens.some(l => l.noteId === m.noteId && lower(l.name) === lower(m.name))).forEach(m => notRemoved.unshift(`screen ${m.name}`));

  const extras = lines.filter(l => l.role === 'hotspot' || l.role === 'note'), same = (a, b) => a.noteId === b.noteId && a.role === b.role && a.text === b.text;
  extras.filter(l => !made.extras.some(m => same(m, l))).forEach(l => steps.push({ kind: l.role === 'hotspot' ? 'comment' : 'description', text: l.text }));
  made.extras.filter(m => !extras.some(l => same(m, l))).forEach(m => notRemoved.push(`${m.role === 'hotspot' ? 'comment' : 'description line'} ${m.text}`));

  // A scenario note: a new one (or one recoloured to a scenario) adds its scenario, an edited one adds its new version; the board keeps the old
  const scenarios = lines.filter(l => l.role === 'scenario'), nameOf = text => scenarioLines(text).name, made_ = id => made.notes[id]?.colour === 'scenario' ? made.notes[id] : null;
  scenarios.forEach(l => {
    const was = made_(l.noteId), changed = was && was.text !== state.pad.notes[l.noteId]?.text;
    if (!was || changed) steps.push({ kind: 'scenario', name: l.name, scenario: l.scenario, warnings: l.warnings, changed: !!changed });
    if (changed) notRemoved.push(`scenario ${nameOf(was.text)}`);
  });
  Object.entries(made.notes).filter(([id, n]) => n.colour === 'scenario' && !made.off.includes(`${id}:0`) && !scenarios.some(l => l.noteId === id))
    .forEach(([, n]) => notRemoved.push(`scenario ${nameOf(n.text)}`));

  const say = s => ({
    rename: `Rename ${ROLE_WORD[s.role]} ${s.from} → ${s.to}${s.shared ? ` (also in ${s.shared} other ${s.shared === 1 ? 'slice' : 'slices'})` : ''}`,
    add: `Add ${ROLE_WORD[s.role]} ${s.name}`, scenario: `Add scenario ${s.name}${s.changed ? ' (its note changed)' : ''}${s.warnings?.length ? ` ⚠ ${s.warnings.join('; ')}` : ''}`, field: `Add field ${s.name}`, screen: `Add screen ${s.name}`, sketch: `Update the sketch of screen ${s.name}`, comment: `Add comment ${s.text}`, description: `Add to description ${s.text}`
  })[s.kind];
  return {
    frameId, available: true, why: null, chapterName: chapter.name, sliceName: slice.name || fresh.name, sliceId: frame.sliceId,
    steps, changes: steps.map((s, i) => ({ key: `${i}`, text: say(s) })), notRemoved, notChanged, fields, canUpdate: true
  };
}
