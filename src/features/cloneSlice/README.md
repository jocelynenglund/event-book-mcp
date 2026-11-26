# Clone slice (alternate endings)

Jocelyn, 2026-11-26: "can we add a clone slice? so i can easily put an alternate ending for failed scenarios". In classic event modeling an
alternate ending is its own slice; Clone makes it, and the board, the Outline and the agent tools show how the alternates hang together.

- **Slice ⋮ → Clone slice** opens a sheet: a name (prefilled "‹slice› (alternate)"), what to **keep** (screen and command, or for a view the read model
  and screen: on; events and scenarios: off) and, for a change, an optional **ending** (a new event, carrying the command's fields). Kept stickies are
  **reused**, not copied (the same elements, so the board shows 🔗 N on them and they stay one command); scenarios, when kept, are copied. The clone
  goes right after the original in its chapter. One action, one undo.
- **A scenario's "Give this its own ending"** (its row in the slice's scenarios drawer): the slice is cloned (screen and command, no events) and the
  scenario **moves** into the clone (`ScenarioMoved`); with an ending, its Then becomes that event. Then the scenario's editor opens.
- **Automations** (2026-11-26, "an alternate ending for Authorize at PayEx"): the change half of an automation (its slice with the processor and the
  command) is cloned like any change: the processor, the command and the screen if any are reused (one processor, so its trigger and read links are
  shared); the clone is an automation of its own (actor processor), NOT paired with the original's view half. The view half is not offered ("Clone
  the change half of an automation"); inferred slices (au_inferred_) still are not. "Give this its own ending" works for such slices too.
- **Flows** (the older feature, `FlowCreated`, `SliceFlowSet`: named ways through a chapter, slice ⋮ → Flow: "Main line" or e.g. "Capture failed",
  a slice has `flowId`): a clone is put in its original's flow (`SliceFlowSet`), so a clone of a slice in "Capture failed" is in "Capture failed". An
  original on the main line leaves its clone on the main line. The two are separate: Flow groups slices by path, a clone records "alternate of".
- **Board**: an alternate's header wears "alt · alternate of S5" (a tap goes to S5 and flashes it); the original wears "S5 · 2 endings". Moved away from
  its original, the alternate still says what it is an alternate of.
- **Outline**: an alternate's row is indented, with "alternate ending" in small muted text.
- **Agent tools**: `clone_slice {slice, name?, keep?, ending?}`; `outline` ends an alternate's line with "· alternate of S5".

## The event

`SliceCloned { sliceId, from }` (in `cloneSlice.events.js`): the provenance of a clone, folded into `state.slices[sliceId].alternateOf` by
`cloneSlice.projection.js`. Deleting the original leaves the clone a plain slice (its views say nothing then). The rest of a clone is the book's
existing events (`SliceCreated`, `SliceMoved`, `SliceElementAdded`, `ScenarioAdded`, `ScenarioMoved`, …).

## What is here

`cloneSlice.command.js` (Clone Slice, Give Scenario Its Own Ending), `cloneSlice.rules.js`, views `alternateOfMark.read.js`,
`sliceEndingsLabel.read.js`, `outlineAlternateNote.read.js`, `cloneSliceMenuOption.read.js`, `scenarioOwnEnding.read.js`, `cloneSliceChoices.read.js`,
`cloneSlice.parts.js` (one component per view), `sheet.js` (the sheet and the tap on the alt mark), `cloneSlice.styles.js`, `cloneSlice.mcp.js`.

## Hooks outside this folder

Every one is a single line marked `feature: clone-slice` (`grep -rn "feature: clone-slice" src tools tests`): `core/projections.js` (2),
`board/sheets.js` (2: the sheet's actions), `board/sheets/sliceMenu.js` (3: the menu option), `board/boardSliceHeaderFields.read.js` (3) and
`board/board.parts.js` (3: the header's marks), `board/sheets/sliceScenariosDrawer.read.js` (2) and `scenarios.parts.js` (2: the scenario's button),
`outline/outlineSliceRow.read.js` (2) and `outline.parts.js` (2: the row's note), `tools/eventpad-mcp/server.mjs` (3), `tools/eventpad-mcp/README.public.md` (1),
`tests/gwt/gwt.mjs` (1).

## To remove

1. Delete this folder.
2. Delete `tests/gwt/clone-slice.test.mjs`, `tests/gwt/clone-slice-parts.test.mjs`, `tests/mcp-clone-slice.test.js`, `tests/clone-slice.test.js` and `tests/feature-clone-slice-boundary.test.js`.
3. Delete every line marked `feature: clone-slice` (the lists they sit in stay, empty).
4. Old books that hold `SliceCloned` still open: the event is ignored.
