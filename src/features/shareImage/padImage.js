// ===========================================
// SHARE IMAGE - Picture of the Pad (canvas)
// Draws a Pad Picture Shot (padPictureShot.read.js) as the Pad looks: dotted paper, dashed frames with their names, flat coloured notes
// (titles and bodies, a scenario's G / W / T, a screen's window), 🔗 counts; the book's name above and "Made with Event Book" below.
// It draws from the shot alone and reads nothing of the book.
// ===========================================

import { wrap, roundRect, themes, notes as palette, BODY, DISPLAY, MONO, MAX_PIXELS, MAX_SIDE } from './render.js';
import { WIRE, MARGIN } from './padPictureShot.read.js';

const GRID = 24;
// The Pad's note colours (styles.css .pad-note), the board's sticky colours where there is one
const FILL = {
  blue: palette.command, orange: palette.event, green: palette.readModel, automation: palette.processor,
  red: { fill: '#f6a5a5', text: '#3a0f0f', stroke: '#d95f5f', ring: 2 },
  white: { fill: '#ffffff', text: '#1f1f1f', stroke: 'rgba(0, 0, 0, 0.22)', ring: 1 },
  scenario: { fill: '#ebe6dc', text: '#2b241c', stroke: '#d9ccb6', ring: 1 },
  screen: { fill: '#ffffff', text: '#2b241c', stroke: '#b4ad9e', ring: 1 }
};
const FONT_PX = { m: 15, s: 12.5, xs: 10.5 };   // a long note's text shrinks to fit (padNotes.read.js)

const font = (weight, px, family = BODY) => `${weight} ${px}px ${family}`;

// Text lines in a box: the lines it was given wrapped to `maxW`, stopping at the box's bottom. Returns the y after the last line.
function paragraph(ctx, lines, x, y, maxW, px, bottom, color) {
  ctx.fillStyle = color;
  for (const raw of lines) {
    for (const line of wrap(ctx, raw, maxW, 6)) {
      if (y + px * 1.3 > bottom) return y;
      ctx.fillText(line, x, y);
      y += px * 1.35;
    }
  }
  return y;
}

function drawPlain(ctx, n, c) {
  const px = FONT_PX[n.size] || 15, pad = 16, maxW = n.w - pad * 2;
  let y = n.y + pad;
  ctx.font = font(700, px);
  y = paragraph(ctx, [n.title], n.x + pad, y, maxW, px, n.y + n.h - pad / 2, c.text);
  if (!n.bodyLines.length) return;
  y += 4;
  ctx.strokeStyle = c.text; ctx.globalAlpha = 0.28; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(n.x + pad, y); ctx.lineTo(n.x + n.w - pad, y); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = font(400, px * 0.87);
  paragraph(ctx, n.bodyLines, n.x + pad, y + 6, maxW, px * 0.87, n.y + n.h - pad / 2, c.text);
}

// A scenario note: its name, then each Given / When / Then line behind a small G, W or T
function drawScenario(ctx, n, c, t) {
  const px = FONT_PX[n.size] || 15, pad = 14, rowPx = Math.max(9.5, px * 0.8);
  ctx.font = font(700, px);
  let y = paragraph(ctx, [n.title], n.x + 12, n.y + pad, n.w - 24, px, n.y + n.h - 6, c.text) + 4;
  ctx.strokeStyle = c.text; ctx.globalAlpha = 0.28;
  ctx.beginPath(); ctx.moveTo(n.x + 12, y); ctx.lineTo(n.x + n.w - 12, y); ctx.stroke();
  ctx.globalAlpha = 1;
  y += 6;
  n.scenario.rows.forEach(row => {
    if (y + rowPx > n.y + n.h - 6) return;
    if (row.label) {
      roundRect(ctx, n.x + 12, y, 15, 15, 3); ctx.fillStyle = t.muted; ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = font(700, 9.5); ctx.textAlign = 'center'; ctx.fillText(row.label, n.x + 12 + 7.5, y + 3); ctx.textAlign = 'left';
    }
    ctx.font = font(400, rowPx);
    y = paragraph(ctx, [row.text], n.x + 12 + 21, y, n.w - 24 - 21, rowPx, n.y + n.h - 6, c.text) + 3;
  });
}

// A screen note: the Pad's low-fi window
function drawScreen(ctx, n, c) {
  ctx.fillStyle = '#ece8df';
  ctx.fillRect(n.x, n.y, n.w, WIRE.bar);
  ctx.strokeStyle = '#c9c2b3'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(n.x, n.y + WIRE.bar); ctx.lineTo(n.x + n.w, n.y + WIRE.bar); ctx.stroke();
  [0, 1, 2].forEach(i => { ctx.beginPath(); ctx.arc(n.x + 11 + i * 9, n.y + WIRE.bar / 2, 3, 0, Math.PI * 2); ctx.fillStyle = '#bdb6a6'; ctx.fill(); });
  ctx.fillStyle = c.text; ctx.font = font(700, 11);
  ctx.fillText(wrap(ctx, n.screen.title, n.w - 50, 1)[0] || '', n.x + 40, n.y + 6);
  let y = n.y + WIRE.bar + WIRE.pad;
  n.screen.lines.forEach(parts => {
    const rm = parts.find(p => p.type === 'readModel');
    if (rm) {
      const h = rm.fields.length ? WIRE.readModelFields : WIRE.readModel, x = n.x + 10, w = n.w - 20;
      roundRect(ctx, x, y, w, h, 3); ctx.fillStyle = palette.readModel.fill; ctx.fill();
      ctx.setLineDash([4, 3]); ctx.strokeStyle = '#6aa95b'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = palette.readModel.text; ctx.font = font(700, 11);
      ctx.fillText(wrap(ctx, rm.name, w - 14, 1)[0], x + 7, y + 6);
      if (rm.fields.length) { ctx.font = font(400, 10); ctx.globalAlpha = 0.8; ctx.fillText(wrap(ctx, rm.fields.join(' · '), w - 14, 1)[0], x + 7, y + 22); ctx.globalAlpha = 1; }
      y += h + WIRE.gap;
      return;
    }
    let x = n.x + 10;
    parts.forEach(p => {
      if (p.type === 'text') { ctx.font = font(400, 11); ctx.fillStyle = '#5a5144'; ctx.fillText(p.text, x, y + 5); x += ctx.measureText(p.text).width + 6; return; }
      const label = p.label, bold = p.type === 'button';
      ctx.font = font(bold ? 700 : 400, 11);
      const w = Math.max(p.type === 'input' ? 68 : 0, ctx.measureText(label).width + (bold ? 22 : 16)), h = 18;
      roundRect(ctx, x, y, w, h, bold ? 9 : 3); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.strokeStyle = bold ? '#2b241c' : '#8f877a'; ctx.lineWidth = bold ? 1.5 : 1; ctx.stroke();
      ctx.fillStyle = bold ? '#2b241c' : '#7a7266'; ctx.fillText(label, x + (bold ? 11 : 8), y + 3.5);
      x += w + 6;
    });
    y += WIRE.line + WIRE.gap;
  });
}

// An automation note: ⚙ then the name, what it reads and what it does
function drawAutomation(ctx, n, c) {
  const px = FONT_PX[n.size] || 15, pad = 16;
  ctx.font = font(700, px);
  let y = paragraph(ctx, [`⚙ ${n.title}`], n.x + pad, n.y + pad, n.w - pad * 2, px, n.y + n.h - 8, c.text) + 4;
  ctx.strokeStyle = c.text; ctx.globalAlpha = 0.28;
  ctx.beginPath(); ctx.moveTo(n.x + pad, y); ctx.lineTo(n.x + n.w - pad, y); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = font(400, px * 0.87);
  paragraph(ctx, n.automation.rows.map(r => (r.kind === 'reads' ? `reads ${r.text}` : r.kind === 'target' ? `→ ${r.text}` : r.text)), n.x + pad, y + 6, n.w - pad * 2, px * 0.87, n.y + n.h - 8, c.text);
}

function drawNote(ctx, n, t) {
  const c = FILL[n.colour] || FILL.blue;
  ctx.save();
  ctx.shadowColor = t.shadow; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
  roundRect(ctx, n.x, n.y, n.w, n.h, n.screen ? 6 : 2);
  ctx.fillStyle = c.fill; ctx.fill();
  ctx.restore();
  if (c.stroke) { roundRect(ctx, n.x, n.y, n.w, n.h, n.screen ? 6 : 2); ctx.strokeStyle = c.stroke; ctx.lineWidth = c.ring || 1; ctx.stroke(); }
  ctx.save();
  roundRect(ctx, n.x, n.y, n.w, n.h, n.screen ? 6 : 2); ctx.clip();
  ctx.textBaseline = 'top';
  if (n.screen) drawScreen(ctx, n, c);
  else if (n.scenario) drawScenario(ctx, n, c, t);
  else if (n.automation) drawAutomation(ctx, n, c);
  else drawPlain(ctx, n, c);
  ctx.restore();
  if (n.places > 1) {
    ctx.font = font(700, 12);
    const label = `🔗 ${n.places}`, w = ctx.measureText(label).width + 14;
    roundRect(ctx, n.x + n.w - 6 - w, n.y + n.h - 5 - 20, w, 20, 10); ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.fillText(label, n.x + n.w - 6 - w + 7, n.y + n.h - 5 - 10); ctx.textBaseline = 'top';
  }
}

function drawFrame(ctx, f, t) {
  roundRect(ctx, f.x, f.y, f.w, f.h, 16);
  ctx.fillStyle = t.text; ctx.globalAlpha = 0.03; ctx.fill(); ctx.globalAlpha = 0.38;
  ctx.setLineDash([8, 6]); ctx.strokeStyle = t.text; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  ctx.textBaseline = 'middle';
  ctx.font = font(f.nameIsDefault ? 500 : 700, 15);
  ctx.fillStyle = f.nameIsDefault ? t.muted : t.text;
  const room = f.w - 28 - (f.made ? 150 : 90), name = wrap(ctx, f.name, Math.max(60, room), 1)[0];
  ctx.fillText(name, f.x + 14, f.y + 20);
  let x = f.x + 14 + ctx.measureText(name).width + 10;
  if (f.made) {
    ctx.font = font(600, 12);
    const label = wrap(ctx, `✓ ${f.made}`, 140, 1)[0], w = ctx.measureText(label).width + 18;
    roundRect(ctx, x, f.y + 7, w, 26, 13); ctx.fillStyle = 'rgba(63, 125, 50, 0.14)'; ctx.fill();
    ctx.strokeStyle = 'rgba(63, 125, 50, 0.45)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#2f6a24'; ctx.fillText(label, x + 9, f.y + 20);
  }
  ctx.font = font(600, 12); ctx.fillStyle = t.muted; ctx.textAlign = 'right';
  ctx.fillText(`${f.noteCount} ${f.noteCount === 1 ? 'note' : 'notes'}`, f.x + f.w - 14, f.y + 20);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// shot: Pad Picture Shot. -> a canvas, 2× by default (smaller for a Pad too big for a phone to draw)
export function renderPadImage({ shot, theme = 'light', scale = 2 } = {}) {
  const t = themes[theme] || themes.light, { width, height } = shot;
  scale = Math.min(scale, Math.sqrt(MAX_PIXELS / (width * height)), MAX_SIDE / width, MAX_SIDE / height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'top';
  ctx.fillStyle = t.bg; ctx.fillRect(0, 0, width, height);
  // Dotted paper, like the Pad's own
  ctx.fillStyle = t.text; ctx.globalAlpha = 0.24;
  for (let y = GRID / 2; y < height; y += GRID) for (let x = GRID / 2; x < width; x += GRID) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  // The book's name, and what this shows
  ctx.fillStyle = t.text; ctx.font = font(700, 38, DISPLAY);
  ctx.fillText(wrap(ctx, shot.title, width - MARGIN * 2, 1)[0], MARGIN, MARGIN - 6);
  ctx.fillStyle = t.muted; ctx.font = font(500, 17);
  ctx.fillText(shot.subtitle, MARGIN, MARGIN + 44);
  shot.frames.forEach(f => drawFrame(ctx, f, t));
  shot.notes.forEach(n => drawNote(ctx, n, t));
  ctx.fillStyle = t.text; ctx.font = font(700, 14, MONO); ctx.textAlign = 'right';
  ctx.fillText(shot.credit, width - MARGIN, height - 36);
  ctx.textAlign = 'left';
  return canvas;
}
