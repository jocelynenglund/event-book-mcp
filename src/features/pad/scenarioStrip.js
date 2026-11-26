// ===========================================
// PAD - Scenario strips on the screen (SV: Pad Make Scenario, Pad Scenario Strip)
// The Pad's wiring for example-note strips (padStrip.rules.js), kept out of view.js: the Make scenario… sheet (its name and must-have star are
// this device's until Make scenario), and the "Lay out as notes" button under the toolbar. view.js hands it what it has (the book as drawn, the
// selection, how to select and how to say a write was done); every write is the book's own command (scenarioStrip.command.js).
// ===========================================

import { padMakeScenario as sheetView } from './padMakeScenario.read.js';
import { padScenarioStrip as barView } from './padScenarioStrip.read.js';
import { padMakeScenario, padScenarioStrip } from './pad.parts.js';
import { makeScenario, layOutScenario } from './scenarioStrip.command.js';
import { openBoardSheet } from '../board/sheets/shared.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';

let ui = null;      // Make scenario… is open: { noteIds, name, mustHave }
let host = null;    // { state(), selected(): [noteId], select([noteId]), wrote(refused, message) }

// The button under the toolbar for the notes selected now: Make scenario… or Lay out as notes ('' when neither applies)
export const barHtml = (state, selectedIds, editable) => padScenarioStrip(barView(state, { selectedIds, editable }));

// A tap on a toolbar or bar button: true when it was one of this module's
export function strip(action) {
  if (action === 'make-scenario') { open(); return true; }
  if (action === 'lay-out') { layOut(); return true; }
  return false;
}

function draw(first = false) {
  openBoardSheet(padMakeScenario(sheetView(host.state(), ui)), first ? 'padScenarioName' : null);
}

function open() {
  ui = { noteIds: host.selected(), name: null, mustHave: false };
  draw(true);
}

function make() {
  const box = document.getElementById('padScenarioName'), { noteIds, mustHave } = ui;
  const result = makeScenario({ noteIds, name: box ? box.value : ui.name, mustHave });
  if (result.refused) { showToast(result.refused); return; }
  ui = null;
  hideAllSheets();
  host.select([result.noteId]);
  host.wrote(null, 'Made the scenario');
}

function layOut() {
  const [noteId] = host.selected(), result = layOutScenario({ noteId });
  if (result.refused) { showToast(result.refused); return; }
  host.select(result.noteIds);
  host.wrote(null, `Laid out ${result.noteIds.length} ${result.noteIds.length === 1 ? 'note' : 'notes'}${result.left.length ? ` (left out: ${result.left.join('; ')})` : ''}`);
}

// The sheet lives in the board sheet, outside the Pad: its own listeners, like Make chapter's
export function initScenarioStrip(api) {
  host = api;
  document.addEventListener('input', e => {
    if (ui && e.target.matches?.('[data-pad-scenario="name"]')) ui.name = e.target.value;
  });
  document.addEventListener('change', e => {
    if (!ui || !e.target.matches?.('[data-pad-scenario="must"]')) return;
    const box = document.getElementById('padScenarioName');
    if (box) ui.name = box.value;
    ui.mustHave = e.target.checked;
    draw();
  });
  document.addEventListener('click', e => {
    const t = ui && e.target.closest('#boardSheetContent [data-pad-action]');
    if (!t) return;
    if (t.dataset.padAction === 'scenario-cancel') { ui = null; hideAllSheets(); }
    else if (t.dataset.padAction === 'scenario-go') make();
  });
}
