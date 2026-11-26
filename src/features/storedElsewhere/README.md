# Stored elsewhere (tables, config files, documents… any kind)

Jocelyn, 2026-11-26: "I want to model tables too. Because there are some other types you don't want to save in events … a config file or doc table
too. I just need to indicate alternative storage options" / "Maybe it's just open ended (kind) and it's the same brown treatment for all alt kinds".

An **event sticky** can say it is not saved as events but kept somewhere else: a **kind** (free text, trimmed and lower-cased for matching, shown in
capitals: `table`, `config`, `document`, `legacy table`…) and an optional **name** (the table, the file). Every kind is drawn the same brown way
(the old legacy-table look) and is a **source** of fields, like an external event: nothing is checked against a command.

- **Event**: `ElementStorageSet { elementId, kind, name? }` (kind `""` clears it). The older `ElementTableSet { table: name | true }` still reads:
  it is kind `legacy table`, name = the table when it is a string. Projection: `state.elements[id].storage = { kind, name? }` (`element.table` is gone:
  every reader asks `el.storage`).
- **Look**: the card label is `TABLE · Friends`, `CONFIG · pricing.json`, `LEGACY TABLE · ORDERS_TBL` (`elementLabel`); `data-stored="true"` on cards,
  chips, rows and the slice page (CSS in `styles.css`: `[data-stored]`, the old legacy-table rules renamed); the share picture and its legend
  ("Stored elsewhere"); the slice page.
- **Board**: an event's ⋮ → **Stored as…** (replaces "Mark as legacy table"): a sheet with the kind (free text, chips: the book's own kinds first, then
  table / document / config / legacy table), an optional name, Save / Clear. One undo (`sheet.js`, view `storedAsChoices.read.js`, parts
  `storedElsewhere.parts.js`, command `storedElsewhere.command.js`).
- **Pad**: an orange note whose first line ends with a one-word kind in brackets — `FriendTable (table)`, `Pricing (config)`,
  `Party settings (document)` — is stored elsewhere: drawn brown with a small kind tag, the name drops the marker, Make chapter / Update chapter set
  `ElementStorageSet`. `(external)` keeps its own meaning (it is not a kind). The notation guide has its own entry for it (`storedElsewhere.guide.js`, registered in `padGuide.rules.js`) and the event swatch's card shows a small brown example. (A pasted list's `Name (table)`
  line is read as a field list, as before: type the marker on the note.)
- **Plan file / agent tools**: `add_steps` event `{ storage: { kind, name } }` (and `storage` beside the event of a do / see step); `table: "<name>"` keeps
  working as a legacy table. `plan.schema.json`, `llms.txt` / `llm.txt`. The outline says `(stored as table: Friends)`.

## What is here

| File | What |
|---|---|
| `storedElsewhere.events.js` | the event |
| `storedElsewhere.rules.js` | kind and name (plain text), the label, the Pad marker, the plan file checks |
| `storedElsewhere.projection.js` | `state.elements[id].storage` (and the legacy `ElementTableSet`) |
| `storedElsewhere.command.js` | Set Stored Elsewhere |
| `storedAsChoices.read.js` | the Stored As Choices view (the sheet) |
| `storedElsewhere.parts.js` | the Stored as sheet, the Pad storage tag |
| `sheet.js` | the sheet's taps and `EventPad.menuStoredAs` |
| `storedElsewhere.styles.js` | the sheet's and the Pad note's CSS |
| `storedElsewhere.guide.js` | its entry and mini example in the Pad's notation guide |
| `storedElsewhere.mcp.js` | the outline note for the agent tools |

## Where it hooks in, and what is generalised in place

Hooks are lines marked `feature: stored-elsewhere` (a few are lines where the old code changed meaning: look at them when removing) (`grep -rn "feature: stored-elsewhere" src tools tests`): `core/constants.js` (the event, the label),
`core/projections.js` (2), `board/sheets.js` (2), `main.js` (the import; the `menuStoredAs,` entry of `window.EventPad` is unmarked because the Used by
check reads that block by shape), the Pad (`padNote.rules.js`, `padNotes.read.js`, `pad.parts.js`, `padScenario.rules.js`, `padClipboard.rules.js`,
`makeChapter.command.js`/`padUpdateChapter.read.js`/`updateChapter.command.js`), the plan file (`planFile/build.js`), the element menu state,
`references/copy.js`, `tools/eventpad-mcp/server.mjs` (2).

The old legacy-table code was **generalised in place**, not hooked: `el.table` became `el.storage` and `data-table` became `data-stored` in the readers
(completeness, field mapping, slice events drawer, share picture, slice page, notation export, the scenario lines' `stored` flag, the element menu's
`stored` mark). Those lines are not marked: a hook would be silly where the old code simply changed meaning.

`tests/feature-stored-elsewhere-boundary.test.js` keeps the feature's own identifiers (the event, its helpers) to this folder and the marked lines.
Removing the feature means deleting this folder, its tests and the marked lines, and putting `el.storage` back to a legacy `table` flag where it is read.
