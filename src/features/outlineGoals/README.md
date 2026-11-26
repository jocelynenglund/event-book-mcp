# Outline goals (Outline for product owners)

From the plan "Event Book · plan: Outline for product owners" (m_mwx6jw4463rso). On the Outline of a fact book:

- the **goal** (the book's preface) and its **one line** (its description) on top, editable through the existing book sheet;
- a pill row: "N criteria", "N chapters" and, once a scenario exists, "P of T criteria proven by a must-have scenario";
- **acceptance criteria**: words, tagged to chapters, proven by must-have scenarios (a ✓ when proven);
- under each chapter's heading: a loose **description**, its criteria, **draft events** (names a chapter will need before a slice holds them) and a **ladder** of seven rungs (described, criteria, events, slices, scenarios, refined, built).

## Events

`CriterionAdded`, `CriterionReworded`, `CriterionTagged` (the whole list), `CriterionRemoved`, `CriterionProofLinked`, `CriterionProofUnlinked`,
`ChapterDescribed`, `EventDrafted`, `DraftEventDropped`. Defined in `events.js`, folded into `state.outlineGoals` by `projection.js`.
A book that has them but not the feature opens fine: the projection has no case for an event it does not know, so they are ignored
(`tests/feature-outline-goals-boundary.test.js` removes the feature from a copy of the app and opens such a book).

## What is here

`command.js` (the commands), `rules.js` (shared pure rules), `*.read.js` (one view per part: Outline Goal, Outline Summary, Criteria Proven,
Acceptance Criteria, Criterion Editor, Chapter Brief, Chapter Draft Events, Chapter Ladder), `outlineGoals.parts.js` (the components),
`view.js` (the Outline's slot: what goes on top and under each chapter), `wire.js` (taps and keys), `uiState.js`, `styles.js` (the CSS,
added to the page once), `mcp.js` (what the MCP `outline` tool prints).

## Hooks outside this folder

Every one is a single line marked `feature: outline-goals` (`grep -rn "feature: outline-goals" src tools tests`):
`core/constants.js` (the event types), `core/projections.js` (the projection call), `features/snapshot/command.js` (a snapshot keeps the corner),
`features/outline/view.js` (the slot, and its click and key listeners), `tools/eventpad-mcp/server.mjs` (the outline text), `tests/gwt/gwt.mjs` (the commands module).

## To remove

1. Delete this folder.
2. Delete `tests/gwt/outline-goals.test.mjs`, `tests/gwt/outline-goals-parts.test.mjs`, `tests/outline-goals.test.js` and `tests/feature-outline-goals-boundary.test.js`.
3. Delete every line marked `feature: outline-goals` (the Outline keeps an empty slot, `extras`, that draws nothing).
4. Old books that hold these events still open: they are ignored.
