// ===========================================
// PAD - A screen as a low-fi window (component: Screen wireframe)
// Drawn from one view: { key, title, empty, lines: [[part]] } (padScreen.rules.js wireframe), a title bar over the screen's lines: a { read model }
// as a labelled box in the read model green (listing the fields when it has them), an [ input ] as a box, a ( button ) as a button, text as
// text; a feature may add small lines under the window (wire.notes: [{ kind, text }]). A part that is dim (seen from a slice it is not about) says so for the CSS to fade. The same window is drawn on the Pad, on the
// board's screen sticky and on the slice page, each from its own view.
// ===========================================

import { selectPartHtml, requiredMark } from '../screenSelect/screenSelect.draw.js'; // feature: screen-select

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const partHtml = p => {
  const dim = p.dim ? ' data-dim="true"' : '';
  if (p.type === 'readModel') return `<span class="pad-wire-rm"${dim}><span class="pad-wire-rm-name">${escapeHtml(p.name)}</span>${p.fields.length ? `<span class="pad-wire-rm-fields">${p.fields.map(escapeHtml).join(' · ')}</span>` : ''}</span>`;
  if (p.type === 'select' || p.type === 'hidden') return selectPartHtml(p, dim, escapeHtml);   // feature: screen-select
  if (p.type === 'input') return `<span class="pad-wire-input"${dim} title="${escapeHtml(p.field)}">${escapeHtml(p.label)}${requiredMark(p, escapeHtml)}</span>`;   // feature: screen-select
  if (p.type === 'button') return `<span class="pad-wire-button"${dim}>${escapeHtml(p.label)}</span>`;
  return `<span class="pad-wire-text">${escapeHtml(p.text)}</span>`;
};

export function screenWire(wire) {
  return `
    <div class="pad-wire" data-component="Screen wireframe" data-key="${escapeHtml(wire.key)}" ${wire.empty ? 'data-empty="true"' : ''}>
      <div class="pad-wire-bar"><span class="pad-wire-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="pad-wire-title">${escapeHtml(wire.title)}</span></div>
      <div class="pad-wire-body">${wire.lines.map(line => `<div class="pad-wire-line">${line.map(partHtml).join('')}</div>`).join('')}</div>
      ${(wire.notes || []).map(n => `<div class="pad-wire-note" data-kind="${escapeHtml(n.kind)}">${escapeHtml(n.text)}</div>`).join('')}
    </div>`;
}
