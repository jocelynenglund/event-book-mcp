// ===========================================
// OUTLINE ARRANGE - Add chapter (SV: Outline Arrange Add Chapter)
// What ＋ Chapter at the end of a part (partId null: of the chapters before the first part) says about where the new
// chapter goes. null when the book can not be arranged, or the part is gone.
// ===========================================

export function outlineArrangeAddChapter(state, partId = null, { arrangeable = true } = {}) {
  if (!arrangeable) return null;
  if (partId == null) return { partId: null, where: 'at the end of the chapters before the first part' };
  const part = state.parts.find(p => p.id === partId);
  return part ? { partId, where: `at the end of ${part.name}` } : null;
}
