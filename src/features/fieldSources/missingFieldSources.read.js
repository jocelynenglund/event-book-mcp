// ===========================================
// FIELD SOURCES - Missing Field Sources (SV)
// For every slice, each field with no origin, and why, with a one-line fix. A hint, never a refusal: the plan can
// still be refined and pressed. Rows come in the slices' order: { slice, sticky, field, why, fix }.
// The MCP outline's lines and the counts on the headers come from the same rules (rules.js).
// ===========================================

import { fieldSources } from './rules.js';

export function missingFieldSources(state) {
  return fieldSources(state).gaps.map(({ slice, sticky, field, why, fix }) => ({ slice, sticky, field, why, fix }));
}
