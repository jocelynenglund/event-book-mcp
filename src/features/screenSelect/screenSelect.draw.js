// SCREEN SELECT - How a pick-one, pick-many or hidden field is drawn inside the screen wireframe (HTML text, from the part alone; no controls: the wireframe is a picture)
//   guests ☐ ☐ ☐   from Guest List       a checkbox list (many)
//   size   ◯ ◯ ◯   from Sizes            a radio list (one)
//   ‹requestId› hidden                   greyed and dashed, with a small tag: it is carried, not shown
// `esc` is the wireframe's own escaper.

export const requiredMark = (p, esc) => (p.required === true ? '<b class="ss-req" title="required"> *</b>' : p.required === false ? '<i class="ss-opt"> optional</i>' : '');

export function selectPartHtml(p, dim, esc) {
  if (p.type === 'hidden') return `<span class="ss-hidden pad-wire-input"${dim} title="${esc(p.field)}">‹${esc(p.label)}› <i class="ss-tag">hidden</i></span>`;
  const glyph = p.select === 'many' ? '☐' : '◯', kind = p.select === 'many' ? 'checkbox' : 'radio';
  return `<span class="ss-pick" data-select="${esc(p.select)}"${dim} title="${esc(p.field)}"><span class="ss-label">${esc(p.label)}${requiredMark(p, esc)}</span>`
    + `<span class="ss-options" data-kind="${kind}" aria-hidden="true"><i>${glyph}</i><i>${glyph}</i><i>${glyph}</i></span><span class="ss-from">from ${esc(p.from)}</span></span>`;
}

