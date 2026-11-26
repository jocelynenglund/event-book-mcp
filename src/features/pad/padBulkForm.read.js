// ===========================================
// PAD - Bulk form (SV: Pad Bulk Form)
// The ＋ Events sheet's top: what has been typed so far. Every line becomes an event (orange) note, so there is no colour to
// pick. The list's preview is its own view (Pad Bulk Preview).
// ===========================================

export function padBulkForm(state, { text = '' } = {}) {
  return { text };
}
