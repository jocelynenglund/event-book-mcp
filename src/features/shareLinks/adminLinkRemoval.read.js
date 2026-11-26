// ===========================================
// SHARE LINKS - Admin Link Removal: the library's admin may remove an old link nobody owns (made before links had
// owners) by pasting it. Offered to the admin only: there is no list of them to browse.
// ===========================================

// who: the signed-in account { admin } or null. -> { show, label, hint }
export function adminLinkRemoval(who = null) {
  return { show: !!who?.admin, label: 'Remove an old link (admin)', hint: 'Paste a link made before links had owners' };
}
