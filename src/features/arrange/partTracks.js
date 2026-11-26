// ===========================================
// ARRANGE - Making room for a part's tab. The shelf's columns are sized one by one and keep their width; a part whose
// chapters are narrower than its tab (a long name over one chapter, a sliver) gets empty shelf after its last chapter,
// one more column as wide as what is missing, so the next part starts clear of the tab. need: px.
// ===========================================

// widths: the grid's column widths so far; from: the index of the part's first column. Capped at most of a phone's width.
export function fitTabTrack(widths, from, need) {
  widths.push(`max(0px, calc(min(${need}px, 86vw) - (${widths.slice(from).join(' + ')})))`);
}
