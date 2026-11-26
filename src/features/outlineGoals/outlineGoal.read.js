// OUTLINE GOALS - View: Outline Goal (feature: outline-goals)
// The book's goal (its preface) and its one line (its description), which open the Outline. Both empty in a new book.
export function outlineGoal(state) {
  return { goal: String(state.preface || '').trim(), oneLine: String(state.modelDescription || '').trim() };
}
