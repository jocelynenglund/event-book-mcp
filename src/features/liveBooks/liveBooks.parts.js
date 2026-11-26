// ===========================================
// LIVE BOOKS - Parts (feature: live-books). A root carries data-component and data-key.
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The chip beside the save chip: ● Live, ↻ Reconnecting, ○ Polling (nothing when hidden). A tap explains it.
export function liveChipButton(v) {
  if (v.state === 'hidden') return '';
  return `<button class="sy-chip lvb-chip" id="lbChip" data-component="Live chip button" data-key="${v.state}" data-state="${v.state}" data-live-action="explain" title="${escapeHtml(v.title)}" aria-label="${escapeHtml(`${v.label}: ${v.title}`)}"><span class="lvb-icon" aria-hidden="true">${v.icon}</span> <span class="lvb-text">${escapeHtml(v.label)}</span></button>`;
}
