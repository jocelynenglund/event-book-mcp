# Outline on desktop (v2 components of the Outline)

Plan: "Plan: Outline on desktop". From **1100 px** the Outline is three columns; below that it is the single column it always was (phones unchanged).

- **Rail (240 px; 200 below 1360)**: the chapters in timeline order, each "N of M refined" with a bar and its gaps (a tap opens the list) or "no scenarios"; a tap scrolls the document to the chapter, and the rail follows the scroll (scroll-spy). Below: the Show filter (the existing stage chips) and the book's counts (slices, scenarios, gaps).
- **Document (fluid)**: the goal and acceptance criteria (the Outline goals' own parts), chapters, and a row per slice. A tap on a row **opens it in place** (several at once): its flow (screen, command, event), fields, the Refined tick (the person's own; nothing here sets it), ＋ Scenario and its scenarios as cards with three columns, **Given | When | Then**, values in boxes (a box left writes the same events the phone's sheets do), Must have / Nice to have, Rejected in red, Nothing happens with its reason, 💬 N. Which rows are open is a device setting (localStorage `eventpad_outline_desktop_open`), not events.
- **Comments (320 px; 280 below 1360)**: every thread in the book, newest first, with a link saying where it is (a slice, a scenario and which line, the whole book); Reply and Resolve in place; Open / Resolved. A tap on the link scrolls to the place, opens its slice, outlines it in orange and lights the card.

What stays a sheet: choosing a different command or event for a scenario (✎), a new slice (＋ Do / See / Auto), a chapter's menu, starting a comment (💬), the nickname question.
Parity with the single column: each row carries the slice's build-progress chip (the Slice progress chip, tap for the steps), an open slice's fields are chips that open the field sheet or trace, and while a field is traced its rows are lit, the others dimmed, and the trace strip shows.
Not drawn here (single column still has them): Select, verifying an edition and article rounds (those books keep the single column), the bottom bar.

## Views (named as the plan's read models) and their components

| View (file) | Component (`outlineDesktop.parts.js`) |
| --- | --- |
| Outline Chapter Rail (`outlineChapterRail.read.js`) | `chapterRail` |
| Outline Book Counts (`outlineBookCounts.read.js`) | `bookCounts` |
| Outline Desk Row (`outlineDeskRow.read.js`) | `deskRow` |
| Outline Open Slice (`outlineOpenSlice.read.js`, S2) | `openSlice` (its fields and scenarios come in as slots) |
| Outline Slice Fields (`outlineSliceFields.read.js`) | `sliceFieldChips` (the single column's field chips: open the field's sheet, ⤳ Trace, ⚠ gaps) |
| Scenario Columns (`scenarioColumns.read.js`, S3) | `scenarioColumnsCard` |
| Book Comments (`bookComments.read.js`, S4) | `bookCommentsColumn` (each link comes in as a slot) |
| Comment Target (`commentTarget.read.js`, S5) | `commentTargetLink` |

`outlineDesktop.screen.js` composes them (no state of its own beyond this device's: open rows, which comments show, where it is) and answers the taps (`data-od`); `outlineDesktop.command.js` holds the two writes it adds on top of the scenario commands (Add Scenario Inline, Edit Scenario Value); `outlineDesktop.styles.js` is the CSS, added to the page once. Existing parts are reused where they were already right: the chapter heading, the add buttons, the search box, the stage chips, the Refined pill.
Tests: `tests/gwt/outline-desktop.test.mjs` (each view's scenarios and each component's test), `tests/outline-desktop.test.js` (the browser at 1440, 1280, 1000 and 390 px), `tests/feature-outline-desktop-boundary.test.js`.

## Hooks outside this folder

Three lines in `src/features/outline/view.js`, each marked `feature: outline-desktop` (`grep -rn "feature: outline-desktop" src`): the import, the draw (`renderOutline` asks it to draw first; it answers false below 1100 px, verifying and in a literature book), and the listeners (`initOutline`).
`tests/feature-outline-desktop-boundary.test.js` keeps it so.

## To remove

1. Delete this folder: `src/features/outlineDesktop/`.
2. Delete `tests/gwt/outline-desktop.test.mjs`, `tests/outline-desktop.test.js` and `tests/feature-outline-desktop-boundary.test.js`.
3. Delete the three lines marked `feature: outline-desktop` (each a whole line).
4. The Outline falls back to the single column at every width. Tests that expect the desktop layout: `tests/status-filter.test.js` ("three columns across the width"), `tests/undo-shortcut.test.js` (opens the row first, then ⋮), `tests/outline-arrange.test.js` (counts `.od-row` beside `.ol-row`).

Nothing is stored in a book by this feature, so books open as before.
