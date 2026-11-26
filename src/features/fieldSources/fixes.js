// ===========================================
// FIELD SOURCES - Fixes: what can be done about a gap
// Each gap offers one-tap fixes, each named by an id the UI's buttons and the agent tools share:
//   add|<target sticky>|<sticky that has the field>|<field>   add the field to the sticky it comes from (its type and item fields too)
//   draw|<slice>|<event>                                       draw an event (one elsewhere in the book) into the slice
//   reads|<processor>                                          make a read slice for an automation that has only a trigger event
//   map|<sticky>|<field>[|<from sticky>|<from field>]          it comes from another sticky's field (the buttons ask which; an agent says it);
//                                                              <from field> @event: the whole event, @event+items: and a list gets its fields as item fields
//   system|<sticky>|<field>                                    set by the system (asks how)
//   remove|<sticky>|<field>                                    take the field off the sticky
//   field|<sticky>|<field>                                     add a plain field to the sticky (a screen's input to its command, a field it shows to its read model)
//   button|<screen>|<label>|<command>                          the screen's button of that label is renamed after the command in the sketch (it sends that command)
//   tidy|<sticky>                                              read fields written as prose back into names
// The rule knows the source where there is one: an event's field ← its slice's command; a command's field ← its
// screen (or, for an automation, its read model); a view's field ← an event that carries it; a Given ← the event.
// ===========================================

// The fixes of one gap (from fieldSources(state).gaps), in the order they are offered
export function fixesOf(g) {
  if (g.fixes) return g.fixes;   // the screen rules know their own
  if (g.kind === 'automation') return [{ id: `reads|${g.elementId}`, kind: 'reads', label: 'Make a read slice for it' }];
  if (g.kind === 'given') return [{ id: `draw|${g.sliceId}|${g.elementId}`, kind: 'draw', label: `Draw ${g.sticky} into ${g.slice}` }];
  return [
    ...g.from.map(t => ({ id: `add|${t.id}|${g.elementId}|${g.field}`, kind: 'add', label: `Add ${g.field} to ${t.name}` })),
    ...(g.holder ? [{ id: `draw|${g.sliceId}|${g.holder.id}`, kind: 'draw', label: `Draw ${g.holder.name} into ${g.slice}` }] : []),
    { id: `map|${g.elementId}|${g.field}`, kind: 'map', label: 'Map from…' },
    { id: `system|${g.elementId}|${g.field}`, kind: 'system', label: 'Set by the system…' },
    { id: `remove|${g.elementId}|${g.field}`, kind: 'remove', label: `Remove ${g.field} from ${g.sticky}` }
  ];
}

// The one fix of a sticky with fields written as prose
export const tidyFix = t => ({ id: `tidy|${t.elementId}`, kind: 'tidy', label: 'Tidy fields…' });
