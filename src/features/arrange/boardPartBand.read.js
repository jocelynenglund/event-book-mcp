// ===========================================
// ARRANGE - Board Part Band (SV: Board Part Band)
// The thin band over the headers of a part's open chapters: the part's name. null when the part is gone.
// ===========================================

export function boardPartBand(state, partId) {
  const part = state.parts.find(p => p.id === partId);
  return part ? { partId, name: part.name } : null;
}
