// ===========================================
// CLONE SLICE - The Clone slice sheet (a slice's ⋮ → Clone slice; a scenario's "Give this its own ending") and the tap on an alternate's mark.
// It draws from Clone Slice Choices and reads nothing of the book itself; the commands are in cloneSlice.command.js.
// ===========================================

import { hideAllSheets } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';
import { render } from '../../ui/feed.js';
import { toastWithUndo } from '../undo/command.js';
import { openBoardSheet, scrollToSlice } from '../board/sheets/shared.js';
import { cloneSliceChoicesNow } from './cloneSliceChoices.read.js';
import { cloneSliceSheet } from './cloneSlice.parts.js';
import { cloneSlice, giveScenarioItsOwnEnding } from './cloneSlice.command.js';
import { ensureCloneSliceStyles } from './cloneSlice.styles.js';

ensureCloneSliceStyles();

function openCloneSheet(sliceId, scenarioId = null) {
  const choices = cloneSliceChoicesNow(sliceId, scenarioId);
  if (!choices) { showToast('That slice is gone'); return; }
  openBoardSheet(cloneSliceSheet(choices), 'csName');
}

function submit(t) {
  const box = t.closest('[data-component="Clone slice sheet"]');
  if (!box) return;
  const { slice, scenario } = box.dataset;
  const name = box.querySelector('#csName')?.value.trim() ?? '';
  const ending = box.querySelector('#csEnding')?.value.trim() ?? '';
  const keep = Object.fromEntries([...box.querySelectorAll('[data-keep]')].map(i => [i.dataset.keep, i.checked]));
  const made = scenario ? giveScenarioItsOwnEnding({ scenarioId: scenario, name, ending }) : cloneSlice({ sliceId: slice, name, keep, ending });
  if (typeof made === 'string') { showToast(made); return; }
  hideAllSheets();
  render();
  toastWithUndo(scenario ? 'Its own ending: the scenario moved into a new slice' : 'Cloned: an alternate ending');
  scrollToSlice(made.sliceId);
  if (scenario) setTimeout(() => window.EventPad.editScenario(scenario), 400);
}

// Taps in the board sheet that belong to this feature; true when handled
export function onSheetAction(a, t) {
  if (a === 'clone-slice') openCloneSheet(t.dataset.slice);
  else if (a === 'clone-own-ending') openCloneSheet(t.dataset.slice, t.dataset.scenario);
  else if (a === 'clone-submit') submit(t);
  else return false;
  return true;
}

// An alternate's "alt · alternate of S5": go to S5
document.addEventListener('click', e => {
  const t = e.target.closest('[data-clone-goto]');
  if (t) scrollToSlice(t.dataset.cloneGoto);
});
