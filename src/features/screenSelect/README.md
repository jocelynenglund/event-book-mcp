# Screen select (pick-one, pick-many, hidden, required and optional screen fields)

Jocelyn, 2026-11-27: "I want a way to specify in a screen that it's a list that selects one or multiple, so I'm thinking a notation like
`[]{listview}` for multi select, `(){listview}` for single." and "then maybe a hidden field? `<request-id>`"; required `*` and optional `?` marks on inputs.

A **screen's field** can now say what it is. In a screen note's text (or the board's screen editor), as a field line or inside the window:

| Written | Means |
|---|---|
| `- guests []{Guest List}` or `[ guests ]{Guest List}` | pick **many** from the view "Guest List" (a list field) |
| `- size (){Sizes}` or `( size ){Sizes}` | pick **one** from the view "Sizes". A `( Button )` with no `{…}` right after it stays a button |
| `- <requestId>` or `<request id>` | **hidden**: the screen carries it into the command, the person does not see or type it. `<x>` with `[]` / `()` is hidden only |
| `- email*` or `[ email* ]` | **required** |
| `- note?` or `[ note? ]` | **optional** |

The view name may have spaces; it is matched exact first, then ignoring letter case and spacing. `[ x ]` with no `{}` stays a plain input.

## What is stored

`ScreenFieldSet { elementId, field, select: 'many' | 'one' | null, optionsFrom: <view name> | null, hidden, required: true | false | null }` on a
**screen sticky's field**: the projection puts `select`, `optionsFrom`, `hidden` and `required` on that property (`state.elements[id].properties[i]`).
A pick-many field has type `array`. Old books have none of it and read as before. The text in the screen's sketch stays the drawing; the hook
`setScreenFieldsFromSketch` (after every `ScreenSketchSet`: Make chapter, Update chapter, Save Screen Text) records it, and takes a field back to plain
when the text no longer says it.

## Where it shows

- **Wireframe** (Pad note, board sticky, slice page, screen editor preview): a checkbox list or a radio list with "from ‹View›" (small), a hidden field greyed and
  dashed with a "hidden" tag, `*` after a required input, "optional" after an optional one (`screenSelect.draw.js`, called by `screenWire.parts.js`).
- **Fields lists** (outline, details, cards): `propLabel` wears the mark: `guests ☑ from Guest List`, `size ◉ from Sizes`, `‹requestId› hidden`, `email *`, `note (optional)`.
- **Completeness**: a select whose view is not a read model in the book is a gap `‹Screen›.‹field›: options from ‹View›, which isn't in the book` (kind `screenSelect`, in the first
  slice the screen is in). When the view exists the field is sourced by it. A hidden or required field needs nothing more: a screen's own fields are not checked for a source, and
  the command it feeds must carry what the screen sends (the existing screen input check), with a pick-many field mapped as a list.
- **Scenario editor**: a command field that comes from a required screen field gets a hint line that a missing value is a good refusal scenario (no scenario is added).
- **Notation guide**: the Screen entry lists all of it.
- **Agent tools**: `add_steps` takes `screenFields` on a step with a screen (`"guests []{Guest List}, <requestId>, email*"`); the plan schema, `llms.txt` and `llm.txt` say so.
- **The plain-text model file**: `⏹️ RSVP(guests []{Guest List}, size (){Sizes}, <requestId>, email*, note?)` reads in and writes out the same.

## What is here

| File | What |
|---|---|
| `screenSelect.events.js` | the event |
| `screenSelect.label.js` | the label a field wears, `isScreenField`, the required hint (imports nothing: `core/constants.js` uses it) |
| `screenSelect.rules.js` | the notation: parts of a screen line, a field line, a field-list entry, the stored field as text, the view lookup |
| `screenSelect.projection.js` | the field's `select`, `optionsFrom`, `hidden`, `required` |
| `screenSelect.command.js` | Set Screen Field, Set Screen Fields From Sketch, Set Screen Fields From Text |
| `screenSelect.gaps.js` | the completeness gap for a view that is not there |
| `screenSelect.draw.js` | the wireframe's HTML for the parts |

## To remove

Delete this folder, `tests/gwt/screen-select.test.mjs` and `tests/feature-screen-select-boundary.test.js`, then the lines marked `feature: screen-select`
(`grep -rn "feature: screen-select" src tools tests styles.css`): the event and `propLabel` in `core/constants.js`, the projection call, the part regex, `fieldLine` and the
input extras in `pad/padScreen.rules.js`, the draw call in `pad/screenWire.parts.js`, the sketch hook in `pad/screenSketch.command.js`, the list type in
`pad/screenMappings.command.js`, the gap call in `fieldSources/rules.js`, the guide lines in `pad/padGuide.rules.js`, the hint in `scenarios/scenarioElementFields.read.js` and
`scenarioEditor.parts.js`, `screenFields` in `planFile/build.js`, the model-file render, plan and import lines, `screenFields` in `tools/eventpad-mcp/server.mjs` and `plan.schema.json`,
the notes in `llms.txt` / `llm.txt`, and the `.ss-*` rules in `styles.css`.
