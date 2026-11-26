// ===========================================
// PAD - The board's screen editor (sheet)
// A screen sticky edited as text, like the Pad's screen note: a text box with the notation ({ Read Model: field } [ Input ] ( Button )), the names
// offered as she types (suggestInput.js, colour 'screen'), and the window it draws live (Screen Text Editor). Save keeps the text on the sticky and maps
// its fields (Save Screen Text); Cancel, or tapping away, changes nothing. It reads the book only through the view, the state handed in by whoever
// opens it (`getState`).
// ===========================================

import { openBoardSheet } from '../board/sheets/shared.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';
import { render } from '../../ui/feed.js';
import { screenTextEditor as view } from './screenTextEditor.read.js';
import { screenTextEditor as draw } from './screenTextEditor.parts.js';
import { saveScreenText } from './screenSketch.command.js';
import { suggestShow, suggestClear, suggestKey, initSuggest } from './suggestInput.js';

let current = null;   // { elementId, getState }

const html = text => { const box = document.createElement('div'); box.innerHTML = text; return box; };

// Redraw the window and its maps for what is typed, leaving the box (and its caret) alone
function redraw(box) {
  const live = document.querySelector('#boardSheetContent [data-stx-live]'), v = current && view(current.getState(), current.elementId, box.value);
  if (live && v) live.innerHTML = html(draw(v)).querySelector('[data-stx-live]').innerHTML;
}

function typed(box, isTyping = true) {
  redraw(box);
  suggestShow({ box, mount: document.getElementById('stxSuggest'), getState: current.getState, colour: 'screen', typed: isTyping });
}

function save() {
  const box = document.getElementById('stxText');
  if (!current || !box) return;
  const refused = saveScreenText(current.elementId, box.value);
  if (refused) { showToast(refused); return; }
  suggestClear();
  hideAllSheets();
  render();
  showToast('Screen saved');
}

export function openScreenText(elementId, getState) {
  const v = view(getState(), elementId);
  if (!v) return;
  current = { elementId, getState };
  openBoardSheet(draw(v), 'stxText');
  const box = document.getElementById('stxText');
  box.addEventListener('input', () => typed(box));
  box.addEventListener('keyup', e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) typed(box, false); });
  box.addEventListener('keydown', e => { if (suggestKey(e)) return; if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } });
  box.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== box) suggestClear(); }, 150));
  initSuggest();
  document.querySelector('#boardSheetContent').onclick = e => {
    const act = e.target.closest('[data-stx-action]')?.dataset.stxAction;
    if (act === 'save') save();
    else if (act === 'cancel') { suggestClear(); hideAllSheets(); }
  };
}
