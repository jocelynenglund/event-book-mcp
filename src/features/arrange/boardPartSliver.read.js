// ===========================================
// ARRANGE - Board Part Sliver (SV: Board Part Sliver)
// What stands under a folded part's tab: the part's name, for the sliver that stands for all its chapters.
// null when the part is gone.
// ===========================================

export function boardPartSliver(state, partId) {
  const part = state.parts.find(p => p.id === partId);
  return part ? { partId, name: part.name } : null;
}
