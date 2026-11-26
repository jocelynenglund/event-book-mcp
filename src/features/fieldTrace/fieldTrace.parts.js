// ===========================================
// FIELD TRACE - Parts: the strip pinned at the bottom while a property is traced
// Drawn from the view that feeds it alone (Field Trace); nothing here reads the book. A root carries data-component
// and data-key. Every step is a tap (it scrolls to its sticky); ✕ ends the trace.
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A step is a field of a sticky, or a whole event (field null): "ProductConfigured (whole event)"
const where = s => `${escapeHtml(s.sticky)}${s.whole ? ' (whole event)' : `.${escapeHtml(s.field)}`}`;
const step = s => `<li class="tr-item"><button class="tr-step${s.start ? ' start' : ''}${s.gap ? ' gap' : ''}${s.whole ? ' whole' : ''}" data-trace-action="step" data-el="${s.elementId}" data-slice="${s.sliceId}" data-chapter="${s.chapterId || ''}" aria-label="Step ${s.n}: ${where(s)}${s.renamedFrom ? `, was ${escapeHtml(s.renamedFrom)}` : ''}${s.gap ? ', has no source' : ''}: show it"><i class="tr-n">${s.n}</i> <span class="tr-sticky">${escapeHtml(s.sticky)}</span><span class="tr-field">${s.whole ? ' (whole event)' : `.${escapeHtml(s.field)}`}</span>${s.renamedFrom ? ` <span class="tr-was">was ${escapeHtml(s.renamedFrom)}</span>` : ''}${s.gap ? ' <span class="tr-gap" aria-hidden="true">⚠</span>' : ''}</button></li>`;

// "✕ Trace orderId   1 Checkout.orderId ▸ 2 Place Order.orderId ▸ 3 Request Payment.orderRef was orderId …"
export function traceStrip(view) {
  return `<div class="tr-strip" data-component="Trace strip" data-key="${view.elementId}:${escapeHtml(view.field)}">
    <button class="tr-end" data-trace-action="end" aria-label="End the trace">✕</button>
    <span class="tr-title">Trace <b>${escapeHtml(view.field)}</b></span>
    <ol class="tr-steps">
${view.steps.map(step).join('\n<li class="tr-sep" aria-hidden="true">▸</li>\n')}
    </ol>
  </div>`;
}
