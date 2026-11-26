// OUTLINE GOALS - what is being written on this device right now (feature: outline-goals)
// Local screen state, never an event: which chapter's description is open for writing, which chapter is taking a new draft event, which draft chip has its Remove menu open, which ladders are listed.
export const goalsUi = { editingChapter: null, draftingChapter: null, draftMenu: null, ladderOpen: new Set() };
