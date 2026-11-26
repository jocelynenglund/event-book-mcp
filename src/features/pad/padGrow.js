// ===========================================
// PAD - Grow to fit (SV: Pad Notes, Pad Frames)
// A note is drawn as tall as its text needs (the stored size is its minimum), so after each draw the real heights are measured here:
// each note's `drawnH` goes onto the scene (the lasso and the viewport use it), and a frame is drawn down to the bottom of the lowest
// note it holds, plus a margin, when that is below its stored height. Nothing is stored: it is derived from what is on screen.
// ===========================================

import { FRAME_PAD } from './padNoteHeight.rules.js';
import { S, $ } from './padScreenState.js';

export function growToFit() {
  const world = $('padWorld');
  if (!world) return;
  S.scene.notes.forEach(n => { n.drawnH = world.querySelector(`[data-pad-note="${n.noteId}"]`)?.offsetHeight || n.h || 180; });
  const byId = new Map(S.scene.notes.map(n => [n.noteId, n]));
  S.scene.frames.forEach(f => {
    const bottoms = f.noteIds.map(id => byId.get(id)).filter(Boolean).map(n => n.y + n.drawnH + FRAME_PAD - f.y);
    f.drawnH = Math.max(f.h, ...bottoms);
    const el = world.querySelector(`[data-pad-frame="${f.frameId}"]`);
    if (el) el.style.height = `${f.drawnH}px`;
  });
}
