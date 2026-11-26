// ===========================================
// FIELD SOURCES - Parts: the fix list sheet and the tidy sheet
// Each draws from the view that feeds it alone (Fix List, Tidy Proposal); nothing here reads the book.
// Every fix is a button that carries its id (data-fix), and the sheet's own taps do the rest (sheet.js).
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// One fix as a button: most apply at once; Set by the system… asks how; Tidy fields… shows before and after first
function fixButton(f, row, sliceId) {
  const here = `data-el="${row.elementId}" data-slice="${sliceId}" data-field="${escapeHtml(row.field ?? '')}"`;
  const action = f.kind === 'system' ? `data-board-action="fx-system" ${here}`
    : f.kind === 'map' ? `data-board-action="fx-map" ${here}`
    : f.kind === 'tidy' ? `data-board-action="fx-tidy-open" data-el="${row.elementId}"`
    : `data-board-action="fx-apply" data-fix="${escapeHtml(f.id)}"`;
  return `<button class="bd-chip fx-fix fx-${f.kind}" ${action}>${escapeHtml(f.label)}</button>`;
}

// A name that goes there: the slice's page opens on that sticky (a button, so Enter and a tap both work)
const stickyLink = (id, name, sliceId, chapterId, cls = '') => `<button type="button" class="fx-link ${cls}" data-board-action="fx-go-el" data-el="${id}" data-slice="${sliceId}" data-chapter="${chapterId || ''}">${escapeHtml(name)}</button>`;

const regexChars = /[.*+?^$|(){}[\]\\]/g;

// The reason, with the stickies it names as links
function whyHtml(row, sliceId, chapterId) {
  const refs = [...new Map((row.refs || []).map(r => [r.name, r])).values()].sort((a, b) => b.name.length - a.name.length);
  if (!refs.length) return escapeHtml(row.why);
  const re = new RegExp(`(${refs.map(r => r.name.replace(regexChars, '\\$&')).join('|')})`);
  return row.why.split(re).map((part, i) => (i % 2 ? stickyLink(refs.find(r => r.name === part).id, part, sliceId, chapterId) : escapeHtml(part))).join('');
}

const fixRow = (row, sliceId, chapterId) => `
      <div class="fx-row">
        <div class="fx-what">${stickyLink(row.elementId, row.sticky, sliceId, chapterId, 'fx-sticky')}${row.field && row.field !== '(the event)' ? ` <span class="fx-field">${escapeHtml(row.field)}</span>` : ''}</div>
        <p class="fx-why">${whyHtml(row, sliceId, chapterId)}.</p>
        ${row.fixes.length ? `<div class="fx-fixes">${row.fixes.map(f => fixButton(f, row, sliceId)).join('')}</div>` : ''}
      </div>`;

// The sheet the count on a header or row opens: every gap with why and its fixes. view: Fix List
export function fixListSheetBody(view) {
  const heading = view.scope !== 'slice';
  return `
    <div class="fg-sheet fx-sheet" data-component="Fix list sheet" data-key="${escapeHtml(`${view.scope}:${view.id}`)}">
      <div class="fg-kicker">Information completeness</div>
      <div class="sheet-title">${escapeHtml(view.title)}${view.total ? ` <span class="bd-sheet-sub">${plural(view.total, 'gap', 'gaps')}</span>` : ''}</div>
      ${view.total ? view.groups.map(g => `
      <div class="fx-group">${heading ? `<div class="fx-slice"><button type="button" class="fx-link fx-slice-link" data-board-action="fx-go-slice" data-slice="${g.sliceId}" data-chapter="${g.chapterId || ''}">${escapeHtml(g.slice)}</button></div>` : ''}${g.rows.map(r => fixRow(r, g.sliceId, g.chapterId)).join('')}
      </div>`).join('') : '<p class="fg-why">Nothing left to fix.</p>'}
      <div class="fg-actions">${view.total ? `<button class="sheet-btn secondary fx-copy" data-board-action="fx-copy" data-scope="${view.scope}" data-id="${escapeHtml(view.id)}">Copy for an agent</button>` : ''}<button class="sheet-btn secondary" data-board-action="close">Close</button></div>
    </div>`;
}

// The sheet before tidying a sticky's fields: each as typed, and as it would be. view: Tidy Proposal
export function tidySheetBody(view) {
  return `
    <div class="fg-sheet fx-sheet fx-tidy-sheet" data-component="Tidy sheet" data-key="${view.elementId}">
      <div class="fg-kicker">Information completeness</div>
      <div class="sheet-title">Tidy the fields of ${escapeHtml(view.sticky)}</div>
      <div class="fx-tidy-head"><span>Before</span><span>After</span></div>
      ${view.rows.map(r => `
      <div class="fx-tidy-row"><span class="fx-before">${escapeHtml(r.before)}</span><span class="fx-after">${r.after ? escapeHtml(r.after) : '<i>removed</i>'}</span>${r.note ? `<span class="fx-note">${escapeHtml(r.note)}</span>` : ''}</div>`).join('')}
      <div class="fg-actions">${view.canApply
        ? `<button class="sheet-btn secondary" data-board-action="close">Cancel</button><button class="sheet-btn" data-board-action="fx-apply" data-fix="tidy|${view.elementId}">Tidy fields</button>`
        : '<button class="sheet-btn secondary" data-board-action="close">Close</button>'}</div>
    </div>`;
}
