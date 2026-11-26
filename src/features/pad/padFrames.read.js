// ===========================================
// PAD - Frames (SV: Pad Frames)
// The dashed frames (sketched slices): where each is, its name (its own, else its command's or view's note title, greyed: `nameIsDefault`,
// else Untitled), which notes are inside it (by position) and, once Make chapter has built it into the board, the chapter it went to
// (null when it was not, or that chapter is gone) as a short chip: "→ <chapter name, cut short>". A made frame says whether the
// sketch changed since (`changed`: a note edited, recoloured, added or taken out; never for one made before that was recorded) and
// whether Update chapter can carry it over (`canUpdate`). A frame is one slice, so one command, one view or one automation: a frame holding more than one
// of them (two commands, a command and a view, an automation and a command) says so in `warning`. selectedIds and editing ({ id, value }: the name typed so far) are this device's.
// A frame is drawn at least as tall as it holds its notes drawn (a note grows to fit its text: padNoteHeight.rules.js): `drawnH` is its stored `h`, or down to the lowest note's bottom and a margin when that is more (nothing stored changes). A frame on the shelf (made, then shelved: padShelf.read.js) is not drawn: it is here only for withShelved (the shelf's chips, the places list); a selected made frame says it `canShelve`.
// ===========================================

import { notesInFrame, KIND_OF } from './sketch.js';
import { titleAndBody, noteHeightOfText } from './padNotes.read.js';
import { FRAME_PAD } from './padNoteHeight.rules.js';
import { ownCommand } from './padAutomation.rules.js';
import { changedSince } from './padMade.rules.js';
import { sliceRef, sliceTitle } from '../../core/projections.js';

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const CHIP_MAX = 24;

// "2 commands: one slice per frame — move one out" (null when the frame holds at most one command, view or automation); a mix with an automation says
// "1 automation and 1 command: 2 slice kinds in one frame — move one out"
function warningOf(all) {
  // the command an automation sends may sit in its frame: it is part of the automation's slice
  const autos = all.filter(n => KIND_OF[n.colour] === 'automation'), cmds = all.filter(n => KIND_OF[n.colour] === 'command');
  const own = autos.length === 1 ? ownCommand(autos[0].text, cmds.map(n => ({ name: titleAndBody(n.text).title, note: n }))) : null;
  const notes = own ? all.filter(n => n !== own.note) : all;
  const kinds = notes.map(n => KIND_OF[n.colour]), of = kind => kinds.filter(k => k === kind).length;
  const found = [[of('automation'), 'automation', 'automations'], [of('command'), 'command', 'commands'], [of('readModel'), 'view', 'views']].filter(([n]) => n);
  if (found.reduce((sum, [n]) => sum + n, 0) < 2) return null;
  const said = found.map(([n, one, many]) => count(n, one, many)).join(' and ');
  return `${said}: ${of('automation') && found.length > 1 ? `${found.length} slice kinds in one frame` : 'one slice per frame'} — move one out`;
}

// The title of its command's note, else its view's, else its automation's ('' when it has none)
const defaultName = notes => {
  const of = kind => notes.find(n => KIND_OF[n.colour] === kind && titleAndBody(n.text).title);
  const note = of('command') || of('readModel') || of('automation');
  return note ? titleAndBody(note.text).title : '';
};

// A made frame's chip names the slices it became, "S3 · S4" (three at most, then "…"); with none left on the board it names the chapter
const SLICES_MAX = 3;
function madeChip(state, f, chapter, chapterLabel, changed) {
  const slices = [f.sliceId].filter(id => id && state.slices[id] && sliceRef(state, id));
  const changedText = changed ? 'changed since' : null;
  if (!slices.length) return { label: `→ ${chapterLabel}`, title: `In chapter ${chapter.name}`, changedText };
  const refs = slices.map(id => sliceRef(state, id));
  return {
    label: refs.slice(0, SLICES_MAX).join(' · ') + (refs.length > SLICES_MAX ? ' …' : ''),
    title: `Made into ${slices.map(id => `${sliceRef(state, id)} ${sliceTitle(state.slices[id], state)}`).join(', ')}, in the chapter ${chapter.name}`, changedText
  };
}

export function padFrames(state, { editable = true, selectedIds = [], editing = null, withShelved = false } = {}) {
  const pad = state.pad || { notes: {}, frames: {} };
  return {
    editable,
    frames: Object.values(pad.frames).filter(f => withShelved || !f.shelved).map(f => {
      const inside = notesInFrame(pad, f), movers = notesInFrame(pad, f, true), own = editing?.id === f.id && editing.value != null ? editing.value : f.name;
      const fallback = defaultName(inside), chapter = f.chapterId && state.chapters[f.chapterId] ? { chapterId: f.chapterId, name: state.chapters[f.chapterId].name } : null;
      const changed = !!chapter && changedSince(pad, f);
      const label = chapter && (chapter.name.length > CHIP_MAX ? `${chapter.name.slice(0, 22).trimEnd()}…` : chapter.name);
      const drawnH = Math.max(f.h, ...inside.map(n => n.y + noteHeightOfText(n) + FRAME_PAD - f.y));
      return {
        frameId: f.id, x: f.x, y: f.y, w: f.w, h: f.h, drawnH, name: own, shownName: own.trim() || fallback || 'Untitled', nameIsDefault: !own.trim(),
        noteIds: movers.map(n => n.id), noteCount: inside.length, warning: warningOf(inside),
        selected: selectedIds.includes(f.id), editing: editing?.id === f.id, editable, chapter,
        made: !!chapter, shelved: !!f.shelved, canShelve: editable && !!chapter && !f.shelved && selectedIds.includes(f.id), changed, canUpdate: editable && changed && !!state.slices[f.sliceId],
        chip: chapter ? madeChip(state, f, chapter, label, changed) : null
      };
    })
  };
}
