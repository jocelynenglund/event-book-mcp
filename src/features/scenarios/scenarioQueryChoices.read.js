// SCENARIOS - Scenario Query Choices (SV): the editor's optional Query row for a view scenario: what the caller asks the view with,
// as one line of free text so far ("" when it has none). null for a change (only a view is queried) or when the slice is gone.
export function scenarioQueryChoices(book, sliceId, scenario) {
  if (!book.slices[sliceId] || scenario.type === 'SC') return null;
  return { text: scenario.when?.query || '' };
}
