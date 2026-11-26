// ===========================================
// PAD - Book name (SV: Pad Book Name)
// The open book's name at the start of the Pad's bottom row, as Board and Outline show it in theirs, so with several books open you can tell
// which Pad you are on. -> { title }
// ===========================================

export function padBookName(state) {
  return { title: state.modelName || 'Untitled model' };
}
