// ===========================================
// PAD - Note height (rules)
// A note's stored size is its minimum (NOTE_SIZE); it is drawn as tall as its text needs, so nothing is cropped. The Pad itself measures the real
// note in the browser; everything that has to know the height without a browser (the picture of the Pad, a frame that wraps its notes in the
// view, the MCP tools placing notes in rows) uses this estimate: the lines the text takes at the note's text size (about 0.6 of the font, a little over what text takes, so the picture never crops
// size per letter, the line heights and paddings styles.css gives each kind). A screen note is as tall as its window (screenHeight in the
// picture's shot) and an arrow has a height of its own; neither is estimated here.
// ===========================================

import { NOTE_SIZE } from './sketch.js';
import { scenarioLines } from './padScenario.rules.js';
import { automationLines } from './padAutomation.rules.js';

export const SCENARIO_WIDTH = 164;
const CHAR = 0.6;
// the text size m, s, xs: [title px, body px, scenario row px, automation row px]
const PX = { m: [15, 13, 12, 13], s: [13, 11, 10.5, 11], xs: [11.5, 9.5, 9.5, 9.5] };

const linesOf = (text, px, width) => {
  const perLine = Math.max(1, Math.floor(width / (px * CHAR)));
  return Math.max(1, Math.ceil(String(text).length / perLine));
};
const sum = list => list.reduce((a, b) => a + b, 0);

// How tall a note is drawn, in the Pad's units (never under NOTE_SIZE). note: { colour, text, size, title, bodyLines } as Pad Notes says them
// (padNotes.read.js: noteHeightOfText has them worked out from the colour and text alone). -> a whole number
export function noteHeight({ colour, text, size, title, bodyLines }) {
  const [tpx, bpx, spx, apx] = PX[size] || PX.m;
  let h = 0;
  if (colour === 'scenario') {
    const rows = scenarioLines(text).rows, width = SCENARIO_WIDTH - 24 - 2;
    h = 28 + 2 + linesOf(title, tpx, width) * tpx * 1.25;
    if (rows.length) h += 13 + sum(rows.map(r => Math.max(15, linesOf(r.text, spx, width - 21) * spx * 1.3))) + 3 * (rows.length - 1);
  } else if (colour === 'automation') {
    const rows = automationLines(text).rows, width = NOTE_SIZE - 32;
    h = 32 + linesOf(`⚙ ${title}`, tpx, width) * tpx * 1.25;
    if (rows.length) h += 13 + sum(rows.map(r => linesOf(`${r.kind === 'reads' ? 'reads ' : r.kind === 'target' ? '→ ' : ''}${r.text}`, apx, width) * apx * 1.3)) + 3 * (rows.length - 1);
  } else if (colour === 'screen' || colour === 'arrow') return NOTE_SIZE;
  else {
    const width = NOTE_SIZE - 32;
    h = 32 + linesOf(title, tpx, width) * tpx * 1.25;
    if (bodyLines.length) h += 13 + sum(bodyLines.map(l => linesOf(l, bpx, width) * bpx * 1.35));
  }
  return Math.max(NOTE_SIZE, Math.ceil(h));
}

// The padding a frame keeps below the lowest note it holds when that note has grown past the frame's own height
export const FRAME_PAD = 16;
