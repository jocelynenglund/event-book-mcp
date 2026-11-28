// ===========================================
// CLONE SLICE - Parts, each drawn from its own view alone (a root carries data-component and data-key)
//   Alternate of mark (Alternate Of Mark), Endings label (Slice Endings Label), Alternate ending note (Outline Alternate Note),
//   Clone slice menu option (Clone Slice Menu Option), Own ending button (Scenario Own Ending), Clone slice sheet (Clone Slice Choices)
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// On an alternate's header, one quiet line: "↳ it fails · instead of S5" (in a flow), else "alternate of S5" (a tap goes to S5)
export const alternateOfChip = v => `<button class="cs-alt" data-component="Alternate of mark" data-key="${v.sliceId}" data-clone-goto="${escapeHtml(v.ofId)}" data-chapter="${v.chapterId || ''}" title="Alternate ending of ${escapeHtml(v.ofTitle)}: go there">${v.flow ? `↳ ${escapeHtml(v.flow)} · instead of` : 'alternate of'} ${escapeHtml(v.of)}</button>`;

// Above an original's header: "S5 · 2 endings" (with a ▸ and a tap that shows the flow of its alternates, when they are in one)
export const endingsLabel = v => v.flowId
  ? `<button class="cs-endings" data-component="Endings label" data-key="${v.sliceId}" data-adjacent="${v.adjacent}" data-action="show-flow" data-chapter="${v.chapterId}" data-flow="${v.flowId}" title="Show the flow with the other ending">${escapeHtml(v.ref)} · ${v.endings} endings ▸</button>`
  : `<span class="cs-endings" data-component="Endings label" data-key="${v.sliceId}" data-adjacent="${v.adjacent}">${escapeHtml(v.ref)} · ${v.endings} endings</span>`;

// Under an alternate's title in the Outline, muted (the row is drawn indented)
export const alternateEndingNote = v => `<span class="cs-ol-note" data-component="Alternate ending note" data-key="${v.sliceId}" title="Alternate ending of ${escapeHtml(v.of)}">alternate ending</span>`;

// In a slice's ⋮ menu
export const cloneSliceOption = v => v.offered ? `
        <div class="sheet-option" data-component="Clone slice menu option" data-key="${v.sliceId}" data-board-action="clone-slice" data-slice="${v.sliceId}">
          <div class="sheet-option-icon" style="background: var(--surface-hover);">⑂</div>
          <div class="sheet-option-text">
            <div class="sheet-option-title">Clone slice</div>
            <div class="sheet-option-desc">An alternate ending: a slice of its own that reuses this one's stickies</div>
          </div>
        </div>` : '';

// In an alternate's ⋮ menu: point it at another slice of its chapter, or at none
export const alternateOfMenuItem = v => v.offered ? `
        <div class="sheet-option" data-component="Alternate of menu option" data-key="${v.sliceId}" data-board-action="alternate-of" data-slice="${v.sliceId}">
          <div class="sheet-option-icon" style="background: var(--surface-hover);">↳</div>
          <div class="sheet-option-text">
            <div class="sheet-option-title">Alternate of…</div>
            <div class="sheet-option-desc">Which slice this is an alternate ending of</div>
          </div>
        </div>` : '';

// The "Alternate of…" sheet: the chapter's main-line slices, the one it points at marked, and "None"
export const alternateOfSheet = v => `
    <div class="cs-sheet" data-component="Alternate of sheet" data-key="${v.sliceId}" data-slice="${v.sliceId}">
      <div class="sheet-title">Alternate of <span class="bd-sheet-sub">${escapeHtml(v.title)}</span></div>
      <p class="sy-p">A flow shows this slice in place of the one picked here.</p>
      ${v.options.map(o => `<button class="sheet-btn secondary cs-pick${v.current === o.id ? ' on' : ''}" data-board-action="alternate-of-pick" data-slice="${v.sliceId}" data-of="${o.id}">${v.current === o.id ? '✓ ' : ''}${escapeHtml(o.ref)} ${escapeHtml(o.title)}</button>`).join('')}
      <button class="sheet-btn secondary cs-pick${v.current ? '' : ' on'}" data-board-action="alternate-of-pick" data-slice="${v.sliceId}" data-of="">${v.current ? '' : '✓ '}None: a plain slice</button>
    </div>`;

// On a scenario in a slice's scenarios drawer
export const ownEndingButton = v => `<button class="sheet-btn secondary cs-own-ending" data-component="Own ending button" data-key="${v.scenarioId}" data-board-action="clone-own-ending" data-slice="${v.sliceId}" data-scenario="${v.scenarioId}">⑂ Give this its own ending</button>`;

// The sheet: name, what to keep, its ending
export const cloneSliceSheet = v => `
    <div class="cs-sheet" data-component="Clone slice sheet" data-key="${v.sliceId}" data-slice="${v.sliceId}" data-scenario="${v.scenarioId || ''}">
      <div class="sheet-title">${v.mode === 'scenario' ? 'Its own ending' : 'Clone slice'} <span class="bd-sheet-sub">${escapeHtml(v.mode === 'scenario' ? v.scenarioName : v.title)}</span></div>
      ${v.mode === 'scenario' ? `<p class="sy-p">“${escapeHtml(v.scenarioName)}” moves into a new slice of its own, which reuses the screen and command of ${escapeHtml(v.title)}.</p>` : ''}
      <label class="bd-sheet-label" for="csName">Name</label>
      <input type="text" class="sheet-input" id="csName" value="${escapeHtml(v.name)}" placeholder="Slice name">
      ${v.keeps.length ? `<div class="bd-sheet-label">Keep (the same stickies are reused, not copied)</div>
      <div class="cs-keeps">${v.keeps.map(k => `<label class="cs-keep"><input type="checkbox" data-keep="${k.key}"${k.on ? ' checked' : ''}> ${escapeHtml(k.label)}</label>`).join('')}</div>` : ''}
      ${v.canEnd ? `<label class="bd-sheet-label" for="csEnding">Its ending (optional)</label>
      <input type="text" class="sheet-input" id="csEnding" placeholder="A new event, e.g. Order failed" autocomplete="off">` : ''}
      <button class="sheet-btn" data-board-action="clone-submit">${v.mode === 'scenario' ? 'Give it its own ending' : 'Clone'}</button>
    </div>`;
