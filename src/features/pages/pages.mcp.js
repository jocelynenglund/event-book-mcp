// What the agent tools (tools/eventpad-mcp) say about pages
// outlineNote: beside a screen in the outline, "screen Checkout (on Basket page, Checkout)"
export const outlineNote = e => e.type === 'screen' && e.pages?.length ? `on ${e.pages.join(', ')}` : '';
// formatNote: in the description of the Pad tools, how a screen note names its pages
export const formatNote = ' A screen note may end with "on: Basket page, Checkout" (the pages of the journey the screen sits on; the board shows them as chips and the Pages view as cards).';
