// ===========================================
// OPENING A LINK - Browsing a shared copy: "Not now" on a share's card does not send you away. The shared book
// stays open (a read-only preview: nothing saved, nothing appended) under a slim banner at the top of the header,
// "Viewing a shared copy · Add to my bookshelves · ✕". Going to the bookshelves any way ends the look.
// link.js starts and ends it; the preview itself is core/eventStore.js previewEvents / endPreview.
// ===========================================

import { sharedCopyBanner } from './sharedCopyBanner.read.js';
import { sharedCopyBannerBar } from './linkLoading.parts.js';
import { setReadOnly } from '../readOnly/sheet.js';

let leave = null, watcher = null, bar = null;

export const isBrowsing = () => !!bar;

// name: the shared book's name. onAdd: the Add to my bookshelves of the card. onClose: ✕. onLeave: the reader went to the
// bookshelves some other way (the look is over; nothing else to do)
export function beginBrowse({ name, onAdd, onClose, onLeave }) {
  endBrowse();
  const header = document.querySelector('.header');
  if (!header) return;
  header.insertAdjacentHTML('afterbegin', sharedCopyBannerBar(sharedCopyBanner({ name })));
  bar = header.querySelector('.sc-banner');
  bar.addEventListener('click', e => {
    if (e.target.closest('[data-shared-action=add]')) onAdd();
    else if (e.target.closest('[data-shared-browse=close]')) onClose();
  });
  document.body.classList.add('browsing-shared');
  setReadOnly(true);
  leave = onLeave;
  // The bookshelves shown some other way (the logo, ☰ → Bookshelves, a back link): the look is over
  watcher = new MutationObserver(() => { if (document.body.classList.contains('library-mode')) { const f = leave; endBrowse(); f?.(); } });
  watcher.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

export function endBrowse() {
  watcher?.disconnect();
  watcher = null;
  leave = null;
  bar?.remove();
  bar = null;
  if (document.body.classList.contains('browsing-shared')) {
    document.body.classList.remove('browsing-shared');
    setReadOnly(false);
  }
}
