// ===========================================
// PAD - Stretching a chapter arrow over the frames it covers (a rule, no screen)
// The arrow reaches from its own left edge to the right edge of the last frame below it: the frames whose top is under the arrow and above
// the next arrow down (or the end of the Pad), that start at or right of the arrow's left edge (a small tolerance left of it). No such frame:
// null, the width stays. The width is clamped by the arrow's own limits, as any resize is.
// ===========================================

import { arrowWidth } from './sketch.js';

export const STRETCH_TOLERANCE = 24;

// arrow: { x, y, w }; frames: [{ x, y, w, h }]; arrows: the other arrows [{ x, y }] → the width to give it, or null
export function stretchedWidth(arrow, frames, arrows = []) {
  const next = Math.min(Infinity, ...arrows.filter(a => a.y > arrow.y).map(a => a.y));
  const under = frames.filter(f => f.y > arrow.y && f.y < next && f.x >= arrow.x - STRETCH_TOLERANCE);
  if (!under.length) return null;
  return arrowWidth(Math.max(...under.map(f => f.x + f.w)) - arrow.x);
}
