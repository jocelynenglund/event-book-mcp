# Split into endings (alternate outcomes on one slice)

Jocelyn's rule: one command, one event. A command that can end in success OR failure (Send Capture → Capture Accepted | Capture Attempt Failed) is
drawn, in classic event modeling, as one slice per outcome. Clone Slice (`../cloneSlice/`) already makes the alternate; this feature notices when
the outcomes are still drawn on one slice and splits them in one step.

- **The hint** (a completeness gap, `kind: 'endings'`, listed beside the field gaps in the fix list, the Outline's count and `fix_gaps`): a change
  slice (a Do slice, or an automation's command half) with a command and 2+ outcome events, where every scenario's Then names at most one of them
  (or it has no scenarios): "‹Slice›: ‹A› and ‹B› look like alternate outcomes — one command, one event". External events and events stored elsewhere
  are not outcomes. A view is never hinted (it may read many events). Names are not guessed at: success/failure-looking names alone prove nothing.
- **The fix, "Split into endings"** (`splitendings|<slice>`): the original keeps the outcome most scenarios end in (ties: the first drawn). For each
  other outcome the slice is cloned (Clone Slice: "alternate of S5", screen and command reused), the event goes onto the clone and off the original,
  and the scenarios whose Then is that event move to the clone (a refusal is not tied to an event, so it stays). One action, one undo.
- **Agent tools**: `split_endings {slice}` does the same (refused for a ☑ Refined slice); `fix_gaps` lists the gap with the fix id `splitendings|<slice>`.
- The gap counts with the others ("N fields with no source") in the Outline's counts.

## What is here

`splitEndings.rules.js` (the trigger, the gap, which outcome is kept), `splitEndings.command.js` (Split Into Endings), `splitEndings.mcp.js`.
No event of its own: it records the book's existing events (`SliceCreated`, `SliceCloned`, `SliceElementAdded`, `SliceElementRemoved`, `ScenarioMoved`, …).

## Hooks outside this folder

Each a single line marked `feature: split-endings` (`grep -rn "feature: split-endings" src tools tests`): `fieldSources/rules.js` (2),
`fieldSources/fixes.command.js` (2), `tools/eventpad-mcp/server.mjs` (3), `tests/gwt/gwt.mjs` (1).

## To remove

1. Delete this folder.
2. Delete `tests/gwt/split-endings.test.mjs`, `tests/split-endings.test.js`, `tests/mcp-split-endings.test.js` and `tests/feature-split-endings-boundary.test.js`.
3. Delete every line marked `feature: split-endings`.
