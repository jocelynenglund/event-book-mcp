// ===========================================
// OPENING A LINK - Shared Copy Banner: what the slim bar at the top says while you look at a shared book you have
// not added to your bookshelves: that it is a shared copy (read only), its name, and the two ways out.
// ===========================================

// name: the shared book's name (may be empty). -> { title, name, add, close }
export function sharedCopyBanner({ name = '' } = {}) {
  return { title: 'Viewing a shared copy', name: String(name || '').trim(), add: 'Add to my bookshelves', close: 'Close the shared copy' };
}
