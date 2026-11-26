// ===========================================
// BOARD SHEETS - Shared bits for the board's sheets
// ===========================================

import { showSheet } from '../../../ui/sheets.js';
import { showToast } from '../../../ui/toast.js';
import { liveSlice } from './sliceStillThere.read.js';

export const sliceTypeHelp = {
  SC: { icon: '🟦', title: 'A user does something', desc: 'State change · Screen → Command → Event' },
  SV: { icon: '🟩', title: 'A user sees something', desc: 'State view · Events → Read model → Screen' },
  // An automation is a to-do state view the processor reads, plus the state change it drives
  AUTO: { icon: '⚙️', title: 'The system reacts', desc: 'Adds 2 slices · To-do read model → ⚙️ → Command' }
};

export const placeholders = {
  screen: 'e.g. Checkout',
  command: 'e.g. PlaceOrder',
  event: 'e.g. OrderPlaced',
  readModel: 'e.g. OrderHistory',
  processor: 'e.g. Ship paid orders'
};

export function openBoardSheet(html, focusId) {
  document.getElementById('boardSheetContent').innerHTML = html;
  showSheet('boardSheet');
  if (focusId) setTimeout(() => document.getElementById(focusId)?.focus(), 300);
}

// Outline a slice's header for about a second (CSS .bd-head-flash; none under reduced motion), so a jump to a slice already in view still shows
export function flashSlice(sliceId) {
  const head = document.querySelector(`.bd-head-name[data-slice="${sliceId}"]`)?.closest('.bd-head');
  if (!head) return;
  head.classList.remove('bd-head-flash');
  void head.offsetWidth;   // restart the animation when it is flashed again
  head.classList.add('bd-head-flash');
  setTimeout(() => head.classList.remove('bd-head-flash'), 1100);
}

// Go to a slice's column and flash it; a slice that was deleted says so
export function scrollToSlice(sliceId) {
  if (!liveSlice(sliceId)) { showToast('That slice is gone'); return; }
  requestAnimationFrame(() => {
    document.querySelector(`.bd-head-name[data-slice="${sliceId}"]`)
      ?.closest('.bd-head')
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    flashSlice(sliceId);
  });
}

export function onEnter(id, fn) {
  const input = document.getElementById(id);
  if (input) input.onkeydown = e => { if (e.key === 'Enter') fn(); };
}


// Search ignores case, spaces, dashes and underscores
export const searchKey = s => String(s).toLowerCase().replace(/[\s_\-]+/g, '');
