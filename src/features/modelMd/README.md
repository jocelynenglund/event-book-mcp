# model.md (import and export)

Event Book reads and writes the plain-text event model, `model.md`: the Advent of Vibes format (adventvibes.itsybit.se/event-model.md, v1, plus the optional v1.1 marks).
Plan: "model.md import and export" (m_mwy3w9jfkvkv4).

- **☰ → Import model.md…** (a file, or pasted text), and a `.md` picked in **☰ → Import…** that has `##` chapters with stickies, becomes a **new book** named from its `# title`.
  Right after, a **report sheet** shows the counts, the lines kept as notes, and the book's completeness gaps (the fix list's fields with no source, and "‹Event›: no slice records it"), each linking to its slice.
  A text with no slices (`# Shopping list / - milk`) is refused with "No slices found: …" and nothing is created.
- **☰ → Export… → model.md** (v1.1) and **model.md, plain (v1)**: chapters in timeline order, each a `##` heading with one code block.
- **Agent tools**: `import_model_md {path | markdown}` and `export_model_md {path?, notation?, text?}` (tools/eventpad-mcp, same parse and render).

## What is here

| File | What |
| --- | --- |
| `modelMd.parse.rules.js` | `parse(md)` → `{ title, description, chapters, slices, scenarios, skippedLines }`. Pure. Reads v1 and v1.1; what it can't read is kept (skippedLines + a note on the slice). |
| `modelMd.plan.rules.js` | `toPlan(parsed)` → the plan steps (`eventbook-plan/1`) the agent tools' `add_steps` and ☰ → Import of a plan file build. Pure. |
| `modelMd.command.js` | Import Model Md (builds a new book through `planFile/build.js`: one undo batch, saved once) and Export Model Md. |
| `modelMd.render.rules.js` | `render(state, { notation })` → text. Pure. |
| `importReport.read.js` | the view behind the report (Import Report); `modelMdForms.read.js` the words on the paste sheet and the two Export lines. |
| `modelMd.parts.js` | the components, one per view. `sheet.js` the sheets and taps, `modelMd.styles.js` the CSS, `modelMd.mcp.js` the agent tools. |

## How the notation maps to the book

| model.md | Event Book |
| --- | --- |
| `## chapter` | chapter |
| change slice (🟦 command, 🟧 events, `⏹️ Screen`) | Do slice: screen, command, events |
| view slice (🟩, `[]`, `for <query>`) | See slice: read model (a list when `[]`; the `for` names become its `?query` fields), the events it reads |
| automation (🟧 trigger, `⚙️ reads 🟩 View`, 🟦, 🟧 results) | Auto slice: processor named like the slice, wakes on the trigger event, reads the view (a to-do view), sends the command, records the results |
| time slice (`⏰ moment`) | An Auto slice with no trigger: Event Book has no clock sticky, so the moment is the first line of the slice's note (`⏰ Sunday 20:00`) and export reads it back |
| `🟨 Event` / `🟫 Event` | an external event / an event stored elsewhere (kind "stored elsewhere") |
| `field: type` (text number date money id bool list) | field types (string number date decimal guid boolean array) |
| tests | scenarios: Given → events, When → command (a view: its query), Then → event, `Error:` → refusal, `nothing`, a view's values or rows |
| `★` | must-have |
| `✓` | **never sets Refined** (only the person ticks it): the report counts them. Export writes ✓ for a slice that is refined in the book (v1.1) |
| `Reply:`, `At:`, free text, extra events in a Then, `# comments`, how a field is made | notes on the slice (its description), never lost; the report lists them |
| `field?`, `#s3` | read, not kept (no place for them); export doesn't write them |

A scenario is named by the `# comment` line right above it (written on export in v1.1), else from its outcome (`AddChore: ChoreAdded`).

## Hooks outside this folder

Every one is a single line marked `feature: model-md` (`grep -rn "feature: model-md" src tools index.html`): `main.js` (3: the import, the actions, the Export lines),
`board/sheets.js` (2: the sheet's tap), `eventLog/panel.js` (2: a `.md` that is a model.md), `index.html` (2: the ☰ item, the About tip),
`tools/eventpad-mcp/server.mjs` (2) and its two READMEs (3 rows). `tests/feature-model-md-boundary.test.js` keeps it so.

## To remove

1. Delete this folder: `src/features/modelMd/`.
2. Delete the tests: `tests/gwt/model-md.test.mjs`, `tests/mcp-model-md.test.js`, `tests/model-md-sheet.test.js` and `tests/feature-model-md-boundary.test.js`.
3. Delete every line marked `feature: model-md` (each is a whole line, an import or a call of its own).
4. The agent server's version (0.14.0, the release that added the two tools) is asserted by one test; `tests/menu.test.js` may list the ☰ items.

Nothing is stored in a book by this feature (an import only uses the book's existing events), so books made with it open as before.
