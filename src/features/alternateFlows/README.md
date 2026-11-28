# Alternate flows (alternate endings live in the chapter's flows)

Jocelyn, 2026-11-28: "we did have flows before … can define main flow and other flow but haven't really used it", then "main to be happy case and
then failure should not show the happy case there". An alternate ending (Clone slice, and Split into endings, which builds on it) is
put in a **flow** of its chapter (the older feature: `FlowCreated`, `SliceFlowSet`), so the board's main line is the happy case.

- **Naming**: the flow is named after the alternate's ending: what its name says after a colon ("Send the capture: it fails" → "it fails"), else the
  ending event's name (a split's "Send Capture (Capture Declined)" → "Capture Declined"). An existing flow is reused: the one another alternate of
  the same original is already in (whatever it is called, e.g. "Failure path"), else a flow of that chapter with the same name (case-insensitive).
  Only when there is none is a flow made. The original stays on the main line; an alternate of a slice that is in a flow is in that flow already.
- **When**: Clone slice with an ending, Give a scenario its own ending, and Split into endings do it in the same batch (one undo). A clone with no
  ending stays where its original is.
- **Chapter ⋮ → "Put alternates in flows"** (only shown while the chapter has alternates in no flow) and the agent tool `flows_for_alternates {chapter?}`
  do it for books made before (the tool skips ☑ Refined slices).
- **Board** (the flow switcher is the older chapter header chips, "Main line · ↳ it fails · …", wrapped and bigger on a phone): the main line shows
  the slices that are in no flow (the happy case; other flows' slices step aside). A flow shows its slices and the main line's, except an original
  that has an alternate in that flow: the alternate takes its place (`replacedInFlow`, used by `withFlows`), the original being the ROOT of the chain (an old book's S5 of S4 of S3 replaces S3). An alternate's header says one quiet
  line, "↳ it fails · instead of S9" (a tap goes to S9); the original's label says "S9 · 2 endings ▸" (a tap shows the flow). The Outline tags an alternate
  row with its flow; `outline` (agent tools) ends its line with `in flow "…"`.

**Rename a flow**: the chapter menu's flow names are fields (edit, leave the field); the agent tool `rename_flow {chapter, flow, name}` does it too.

No event of its own: it records the book's existing events.

## What is here

`alternateFlows.rules.js` (names, which flow, which slices a flow steps past), `alternateFlows.command.js` (Put In Ending Flow, Put Alternates In
Flows), views `chapterAlternateFlowsOption.read.js` and `alternateRowFlowTag.read.js`, `alternateFlows.parts.js`, `sheet.js` (the menu tap),
`alternateFlows.styles.js`, `alternateFlows.mcp.js`.

## Hooks outside this folder

Each a single line marked `feature: alternate-flows` (`grep -rn "feature: alternate-flows" src tools tests`): Clone slice's command (1) and
the Split into endings command (1) put the alternate in a flow; `board/boardLayout.read.js` (2: a flow steps past replaced originals),
`board/sheets.js` (2) and `board/sheets/chapters.js` (3: the menu option), `outline/outlineSliceRow.read.js` (2) and `outline/outline.parts.js` (2: the row's
tag), `tools/eventpad-mcp/server.mjs` (3), the two tool READMEs, `tests/gwt/gwt.mjs` (1).

This builds on Clone slice: removing Clone slice removes this too.

## To remove

1. Delete this folder.
2. Delete `tests/gwt/alternate-flows.test.mjs`, `tests/alternate-flows.test.js`, `tests/mcp-alternate-flows.test.js` and `tests/feature-alternate-flows-boundary.test.js`.
3. Delete every line marked `feature: alternate-flows`. Clones are then simply not put in flows (existing flows and slices in them stay).
