// ===========================================
// SHARE IMAGE - The picture's legend: only the kinds of sticky it has
// ===========================================

const kinds = [['command', 'Command'], ['event', 'Event'], ['external', 'External event'], ['stored', 'Stored elsewhere'], ['published', 'Integration event ↗'], ['readModel', 'Read model'], ['screen', 'Screen'], ['processor', 'Automation']];

export const pictureLegend = slices => {
  const pictured = new Set(slices.flatMap(s => s.lanes.flat().map(c => c.kind === 'event' && c.stored ? 'stored' : c.kind === 'event' && c.external ? 'external' : c.kind === 'event' && c.published ? 'published' : c.kind)));
  return kinds.filter(([type]) => pictured.has(type));
};
