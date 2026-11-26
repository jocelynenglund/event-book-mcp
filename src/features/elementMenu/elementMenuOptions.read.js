// ELEMENT MENU - Element Menu Options (SV): what the ⋮ on a sticky offers, in the order the menu lists them:
// a processor's inputs, a read model's list and to-do marks, what wakes a processor, external / stored elsewhere / integration event on an event,
// then comment (in a slice), properties, the ways to its neighbours (a read model: the events it reads and the screen that shows it;
// an event: the read models that read it and the command that produces it; a command: the screen that triggers it and the events it
// produces), remove from slice (in a slice) and delete.
// Each: { key, call (the EventPad function it runs), passThis, icon, iconClass, iconBg, title, desc, danger }.
import { elementMenuState } from './elementMenuState.read.js';
import { elementMenuTrigger } from './elementMenuTrigger.read.js';
import { elementMenuHome } from './elementMenuHome.read.js';
import { elementMenuProducer } from './elementMenuProducer.read.js';
import { elementMenuReaders } from './elementMenuReaders.read.js';

const GREY = 'var(--surface-hover)';

export function elementMenuOptions(book, elementId, sliceId = null) {
  const el = elementMenuState(book, elementId);
  if (!el) return null;
  const trigger = elementMenuTrigger(book, elementId, sliceId);
  const props = book.elements[elementId].properties;
  const option = (key, call, icon, title, desc, more = {}) => ({ key, call, passThis: false, icon, iconClass: '', iconBg: GREY, title, desc, danger: false, ...more });
  // The ways to its neighbours run EventPad.menuSliceEvents, EventPad.menuSliceScreen, EventPad.menuReaders, EventPad.menuProducer and, on a screen, EventPad.menuScreenText (elementMenu/sheet.js); an event's "Stored as…" runs EventPad.menuStoredAs (storedElsewhere/sheet.js) // feature: stored-elsewhere
  const home = elementMenuHome(book, elementId, sliceId);
  const readers = elementMenuReaders(book, elementId);
  const producer = elementMenuProducer(book, elementId);
  const names = list => (list.length ? `${list.length} · ${list.join(', ')}` : 'None yet');
  const screenOf = home && home.actor === 'screen' && option('screen', 'menuSliceScreen', '⏹️', el.type === 'command' ? 'Screen that triggers it' : 'Screen that shows it',
    home.screen ? home.screen.name : 'None yet', { iconBg: 'var(--note-screen)' });
  return [
    el.type === 'processor' && option('processorInputs', 'menuProcessorInputs', '⚙', 'Reads & triggers…', 'The read models it uses and the events that wake it', { iconBg: 'var(--note-readModel)' }),
    el.type === 'readModel' && !el.todo && option('list', 'menuToggleList', '≡', el.list ? 'A single record' : 'A list of rows',
      el.list ? 'One of these, not many' : 'Many of these; its properties describe one row', { iconBg: el.list ? 'var(--note-readModel)' : GREY }),
    el.type === 'readModel' && option('todo', 'menuToggleTodo', '☑', el.todo ? 'Not a to-do list' : 'Mark as to-do list',
      el.todo ? 'Back to a plain read model' : 'A work queue an automation picks items from', { iconBg: el.todo ? 'var(--note-readModel)' : GREY }),
    el.type === 'readModel' && el.todo && option('updatedBy', 'menuUpdatedBy', '+', 'Updated by…', 'Pick the events that add or tick off items', { iconBg: 'var(--note-event)' }),
    trigger && option('trigger', 'menuToggleTrigger', '⚡', trigger.triggering ? `Doesn't trigger ${trigger.name}` : `Triggers ${trigger.name}`,
      trigger.triggering ? 'Only feeds its read models' : 'This event wakes the processor up', { iconBg: trigger.triggering ? 'var(--note-processor)' : GREY }),
    el.type === 'event' && option('external', 'menuToggleExternal', '⇄', el.external ? 'Mark as internal' : 'Mark as external',
      el.external ? 'Happens in this system (orange)' : 'Comes from another system (yellow)', { iconBg: null, iconClass: `bd-type-icon-external${el.external ? ' on' : ''}` }),
    el.type === 'event' && option('stored', 'menuStoredAs', '▦', 'Stored as…', el.stored ? `${el.storedLabel}: change or clear` : 'A table, a config file, a document… not saved as events (shadowy brown)', { iconBg: null, iconClass: `bd-type-icon-stored${el.stored ? ' on' : ''}` }), // feature: stored-elsewhere
    el.type === 'event' && !el.external && option('published', 'menuTogglePublished', '↗', el.published ? 'Not an integration event' : 'Mark as integration event',
      el.published ? 'Private to this system again' : 'Published to other systems: its fields are a contract (outward arrow)', { iconBg: null, iconClass: `bd-type-icon-published${el.published ? ' on' : ''}` }),
    sliceId && option('comment', 'menuComment', '💬', 'Comment', 'On this slice, for whoever reads the plan'),
    el.type === 'screen' && option('screenText', 'menuScreenText', '⏹️', 'Edit as text', 'The screen as text, like the Pad: { Read Model: field } [ Input ] ( Button )', { iconBg: 'var(--note-screen)' }),
    option('properties', 'menuProperties', '📝', 'Properties', props.length ? `${props.length} · ${props.map(p => p.name).join(', ')}` : 'No properties'),
    home && el.type === 'readModel' && option('events', 'menuSliceEvents', '🟧', 'Events it reads…', names(home.events), { iconBg: 'var(--note-event)' }),
    home && el.type === 'command' && screenOf,
    home && el.type === 'command' && option('events', 'menuSliceEvents', '🟧', 'Events it produces…', names(home.events), { iconBg: 'var(--note-event)' }),
    home && el.type === 'readModel' && screenOf,
    readers && option('readers', 'menuReaders', '🟩', 'Read models that read it', names(readers.readers.map(r => r.name)), { iconBg: 'var(--note-readModel)' }),
    el.type === 'event' && option('producer', 'menuProducer', '🟦', 'Command that produces it', producer ? producer.name : 'None yet', { iconBg: 'var(--note-command)' }),
    sliceId && option('removeFromSlice', 'menuRemoveFromSlice', '↩︎', 'Remove from slice', 'Keeps it in the model'),
    option('delete', 'menuDelete', '🗑️', 'Delete', 'Remove element', { passThis: true, iconBg: '#c0392b', danger: true })
  ].filter(Boolean);
}
