# Replay restore (feature: replay-restore)

Jocelyn, 2026-11-28: "Can we add undo or revert to version?" Undo takes back one action; Replay scrubs the history look-only. This adds the way
from one to the other: when Replay is scrubbed to a past step, its bar offers two buttons.

- **Restore this version** (a book you can change): a short sheet asks "Go back to ‹step› (‹time›)? N later changes are taken back; ↶ Undo
  brings them back." On Restore, every action after the step is taken back **as Undo takes one back**: the events leave this device's history
  (`replaceModelEvents`) and, for a kept book, the server is told each later action is undone (`undoBatch`, once per action), so it syncs to the
  library and respects checkouts (`canEditCurrent`). Replay closes at the restored state with the toast "Restored to ‹step› · Undo".
- **Undo right after** (Ctrl+Z, ☰ ↶ Undo, the toast's Undo) brings every taken-back action back at once. Undo here removes events (there is no
  redo), so the restore keeps what it took in memory (`lastRestore`) and `undo()` first asks `undoRestore()`. It only applies while nothing else
  was done since (the last event is the one the restore left). The events come back as new events (new ids, a new batch per action): the server
  keeps its list of undone batches for good, so the old ids would be hidden again on the next sync.
- A step in the middle of an action (Replay splits big imports) keeps that action's earlier events as new events; the old action is undone whole
  on the server.
- **Copy from here** (any book, a read-only one too): a new book from the events up to the step, named "‹Name› · from ‹date time›", opened in
  the library. The original is untouched.
- Read-only books (checked out elsewhere, published, retired, shared copies, an agent's): only Copy from here.

## What is here

`replayRestore.rules.js` (`restorePlan`, `bringBack`: pure), `restoreActions.read.js` (the view: what the bar offers), `replayRestore.parts.js`
(the bar's buttons and the confirm sheet), `replayRestore.command.js` (`restoreVersion`, `undoRestore`, `copyFromHere`), `replayRestore.ui.js`
(mounts into the Replay bar, runs the sheet), `replayRestore.styles.js`.

## Hooks outside this folder

Each is a single line marked `feature: replay-restore` (`grep -rn "feature: replay-restore" src tests`): `replay/replay.js` (3: the import, the
mount, the refresh), `undo/command.js` (2: Undo brings a restore back first), `tests/gwt/gwt.mjs` (1).

## To remove

1. Delete this folder.
2. Delete `tests/gwt/replay-restore.test.mjs`, `tests/replay-restore.test.js` and `tests/feature-replay-restore-boundary.test.js`.
3. Delete every line marked `feature: replay-restore`.
4. Nothing is stored: books are unchanged by the feature.
