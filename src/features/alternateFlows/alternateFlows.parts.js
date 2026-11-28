// ===========================================
// ALTERNATE FLOWS - Parts, each drawn from its own view alone (a root carries data-component and data-key)
//   Alternate flows option (Chapter Alternate Flows Option), Alternate flow tag (Alternate Row Flow Tag)
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// In a chapter's ⋮ menu
export const alternateFlowsOption = v => v ? `
      <div class="sheet-option" data-component="Alternate flows option" data-key="${v.chapterId}" data-board-action="alternate-flows" data-chapter="${v.chapterId}">
        <div class="sheet-option-icon" style="background: var(--surface-hover);">↳</div>
        <div class="sheet-option-text">
          <div class="sheet-option-title">Put alternates in flows</div>
          <div class="sheet-option-desc">${v.count} alternate ending${v.count === 1 ? '' : 's'} with no flow: each goes in a flow named after its ending, off the main line</div>
        </div>
      </div>` : '';

// On an alternate's Outline row, beside its note
export const alternateFlowTag = v => `<span class="af-ol-tag" data-component="Alternate flow tag" data-key="${v.sliceId}" title="In the flow ${escapeHtml(v.flow)}">↳ ${escapeHtml(v.flow)}</span>`;
