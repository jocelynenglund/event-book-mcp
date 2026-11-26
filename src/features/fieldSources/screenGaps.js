// ===========================================
// FIELD SOURCES - A screen's sketch (rules for a screen made from a Pad screen note)
// A screen sticky with a sketch (pad/padScreen.rules.js) says what the screen takes and shows, and the plan checks it:
//   - an INPUT [ x ] goes to the command of a slice the screen is in: no command of that slice takes it, a gap on the screen
//     (fix: add the field to the command); an input on the line of a button that sends another command is that command's;
//   - a { Read Model: field } is on that read model: one that does not carry it is a gap, once, in the slice that shows the read
//     model (else the first slice the screen is in) (fix: add the field to the read model); a read model written whole, or one nowhere on the book, is not checked;
//   - a ( Button ) sends a command, matched by name among the book's commands: one that fits none, or several, is a gap, once, in the
//     first slice the screen is in (fix: pick the command: the button is relabelled with its name in the sketch).
// Each gap carries its fixes (`fixes`, ids in fixes.js).
// ===========================================

import { fieldKey } from '../../core/constants.js';
import { parseScreen, matchButton, fitting, inputsForCommand } from '../pad/padScreen.rules.js';

const carries = (el, name) => (el.properties || []).some(p => fieldKey(p.name) === fieldKey(name));
const lower = s => String(s ?? '').trim().toLowerCase();
const names = els => els.map(e => e.name).join(' or ');
const listed = ns => (ns.length > 2 ? `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}` : ns.join(' and '));
const SHOWN_COMMANDS = 5;   // when the slice has no command to pick from, the first few of the book

// gap(el, field, why, fix, kind, { fixes }) is rules.js's. commands: the commands of this slice.
export function screenGaps(state, slice, screens, commands, gap) {
  const board = Object.values(state.elements).filter(e => e.type === 'command'), boardNames = board.map(c => c.name);
  const inOrder = id => state.sliceOrder.map(s => state.slices[s]).filter(s => s?.elements.includes(id));
  const idOf = name => board.find(c => lower(c.name) === lower(name))?.id;
  screens.filter(s => s.sketch).forEach(screen => {
    const parsed = parseScreen(screen.sketch);

    const inputs = [...new Map(commands.flatMap(c => inputsForCommand(parsed, c.name, boardNames)).map(i => [i.field, i])).values()];
    inputs.filter(i => commands.length && !commands.some(c => carries(c, i.field))).forEach(i =>
      gap(screen, i.field, `${names(commands)} ${commands.length > 1 ? "don't" : "doesn't"} take the ${parsed.name} screen's input ${i.field}`, `add ${i.field} to ${names(commands)}`, 'screenInput',
        { fixes: commands.map(c => ({ id: `field|${c.id}|${i.field}`, kind: 'add', label: `Add ${i.field} to ${c.name}` })) }));

    parsed.readModels.filter(rm => !rm.whole).forEach(rm => {
      const views = Object.values(state.elements).filter(e => e.type === 'readModel' && lower(e.name) === lower(rm.name));
      const withScreen = inOrder(screen.id), home = withScreen.find(s => views.some(v => s.elements.includes(v.id))) || withScreen[0];
      if (home?.id !== slice.id) return;
      const view = views.find(v => home.elements.includes(v.id)) || views[0];
      view && rm.fields.filter(f => !views.some(v => carries(v, f))).forEach(f =>
        gap(screen, f, `${view.name} doesn't carry ${f} (the ${parsed.name} screen shows it)`, `add ${f} to ${view.name}`, 'screenRead', { fixes: [{ id: `field|${view.id}|${f}`, kind: 'add', label: `Add ${f} to ${view.name}` }] }));
    });

    parsed.buttons.filter(b => !matchButton(b.label, boardNames).command && inOrder(screen.id)[0]?.id === slice.id).forEach(b => {
      const fits = fitting(b.label, boardNames), picks = fits.length ? fits : (commands.length ? commands.map(c => c.name) : boardNames.slice(0, SHOWN_COMMANDS));
      gap(screen, b.label, fits.length ? `${b.label} fits ${listed(fits)} (a button on the ${parsed.name} screen)` : `no command called ${b.label} (a button on the ${parsed.name} screen)`,
        'pick the command ' + b.label + ' sends', 'screenButton', { fixes: picks.map(n => ({ id: `button|${screen.id}|${b.label}|${idOf(n)}`, kind: 'pick', label: `Send ${n} from ${b.label}` })) });
    });
  });
}
