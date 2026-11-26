// ===========================================
// OUTLINE GOALS - Event types (feature: outline-goals)
// Merged into EventTypes by one marked line in core/constants.js. A book that has these events but
// not the feature just ignores them: the projection has no case for an event it does not know.
// ===========================================

export const OutlineGoalsEvents = {
  CriterionAdded: 'CriterionAdded',                 // an acceptance criterion, tagged to chapters { criterionId, text, chapters: [chapterId] }
  CriterionReworded: 'CriterionReworded',           // { criterionId, text }
  CriterionTagged: 'CriterionTagged',               // the whole list of its chapters { criterionId, chapters: [chapterId] }
  CriterionRemoved: 'CriterionRemoved',             // { criterionId }
  CriterionProofLinked: 'CriterionProofLinked',     // a must-have scenario proves it { criterionId, scenarioId }
  CriterionProofUnlinked: 'CriterionProofUnlinked', // { criterionId, scenarioId }
  ChapterDescribed: 'ChapterDescribed',             // a chapter's loose description { chapterId, description }
  EventDrafted: 'EventDrafted',                     // an event a chapter will need, before any slice holds it { chapterId, name }
  DraftEventDropped: 'DraftEventDropped'            // { chapterId, name }
};
