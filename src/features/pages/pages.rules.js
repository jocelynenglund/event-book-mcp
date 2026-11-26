// ===========================================
// PAGES - What a page is (pure; the projection and the commands share it)
// A page of the journey exists by being named on a screen: a screen sticky says which pages it sits on (`pages`, the whole list each time), and the
// book keeps the pages' journey order (`pageOrder`, names). Page names are told apart trimmed and without regard to case ("Checkout" and "checkout "
// are one page); the first spelling the book has is the page's name. Pages left out of the order come after it, by name.
// ===========================================

export const pageKey = name => String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

// The names tidied: trimmed, blanks dropped, one of each (the first spelling kept), in the order given
export function tidyPages(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).map(n => String(n ?? '').trim().replace(/\s+/g, ' ')).filter(n => {
    const k = pageKey(n);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const samePages = (a, b) => {
  const x = tidyPages(a).map(pageKey), y = tidyPages(b).map(pageKey);
  return x.length === y.length && x.every((k, i) => k === y[i]);
};

// A page renamed in a list of names: the name now, one of each (a page renamed onto one the list has is merged into it)
export const renamedIn = (list, from, to) => tidyPages((list || []).map(n => (pageKey(n) === pageKey(from) ? to : n)));

// The book's pages in journey order: [{ key, page, screenIds }]. state: a projected book ({ elements, pageOrder }).
// A page's name is the first spelling the screens (in the order they were made) give it; its screens are the ones that name it.
export function journeyOf(state) {
  const pages = new Map();
  Object.values(state.elements || {}).filter(e => e.type === 'screen' && e.pages?.length).forEach(e => e.pages.forEach(name => {
    const k = pageKey(name), have = pages.get(k) || { key: k, page: name, screenIds: [] };
    if (!have.screenIds.includes(e.id)) have.screenIds.push(e.id);
    pages.set(k, have);
  }));
  const ordered = [], left = new Map(pages);
  (state.pageOrder || []).forEach(name => { const k = pageKey(name); if (left.has(k)) { ordered.push(left.get(k)); left.delete(k); } });
  return [...ordered, ...[...left.values()].sort((a, b) => a.key.localeCompare(b.key))];
}
