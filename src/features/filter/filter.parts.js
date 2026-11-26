// ===========================================
// STAGE FILTER - components, each drawn from its view alone (Stage Filter Counts).
// ===========================================

// Stage filter note: "Showing: To refine ✕"; the ✕ is the tap on the chip that's on, so it goes back to All
export function stageFilterChip(view) {
  if (!view?.on) return '';
  return `<div class="st-note" data-component="Stage filter note" data-key="stage-note"><span>Showing: <b>${view.label}</b></span><button class="st-note-x" data-status-filter="${view.key}" aria-label="Show all slices">✕</button></div>`;
}

// Stage chips: show only the slices at one stage; tapping the one that's on goes back to All
export function stageChips(view) {
  if (!view?.chips?.length) return '';
  return `<span class="st-filter" data-component="Stage chips" data-key="stages" role="group" aria-label="Show slices">${view.chips.map(c => `
    <button class="st-chip ${c.on ? 'on' : ''}" data-status-filter="${c.key}" aria-pressed="${c.on}">${c.label}${c.count == null ? '' : ` <span class="st-n">${c.count}</span>`}</button>`).join('')}</span>`;
}
