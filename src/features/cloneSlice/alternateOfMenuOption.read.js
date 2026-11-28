// CLONE SLICE - Alternate Of Menu Option (SV)
// Whether a slice's ⋮ menu offers "Alternate of…": only an alternate does (to point it at another slice, or at none). -> { sliceId, offered }
export const alternateOfMenuOption = (book, sliceId) => ({ sliceId, offered: !!book.slices[sliceId]?.alternateOf });
