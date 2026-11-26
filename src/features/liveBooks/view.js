// ===========================================
// LIVE BOOKS - The chip and the wiring (feature: live-books)
// Starts the connection (connection.js) and draws the Live Chip beside the save chip in an open book's top bar (Board, Outline
// and Pad), redrawn by the save chip's update (which every screen's draw calls) and when the link changes. A tap on it says what it means.
// ===========================================

import { account, isKept, isBuildShelf, isReviewerAccount } from '../sync/client.js';
import { getCurrentModelId } from '../../core/eventStore.js';
import { showToast } from '../../ui/toast.js';
import { reviewOf } from '../review/client.js';
import { startLiveBooks, liveLink, onLiveLink } from './connection.js';
import { liveChip } from './liveChip.read.js';
import { liveChipButton } from './liveBooks.parts.js';
import { addLiveBooksStyles } from './styles.js';

export function updateLiveChip() {
  const id = getCurrentModelId();
  const inBook = !document.body.classList.contains('library-mode');
  const v = liveChip(inBook ? { signedIn: !!account(), reviewer: isReviewerAccount(), reviewing: !!reviewOf(id), kept: isKept(id), build: isBuildShelf(id), link: liveLink() } : { signedIn: false });
  const el = document.getElementById('lbChip');
  const html = liveChipButton(v);
  if (!html) { el?.remove(); return; }
  if (el && el.dataset.state === v.state && el.title === v.title) return;   // as drawn
  const at = document.getElementById('sySave') || document.getElementById('shareBtn');
  if (!at) return;
  addLiveBooksStyles();
  el?.remove();
  at.insertAdjacentHTML('beforebegin', html);
}

export function initLiveBooks() {
  onLiveLink(updateLiveChip);
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-live-action="explain"]');
    if (t) showToast(t.title);
  });
  startLiveBooks();
}
