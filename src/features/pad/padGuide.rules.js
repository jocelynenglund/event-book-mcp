// ===========================================
// PAD - The notation guide's words (pure data)
// What each note colour stands for and how it is written, with a real example that is drawn as that note, and the Pad's general rules.
// One place for them: the hover card (Pad Kind Card) and the full guide (Pad Guide) both read these. The examples are what the Pad reads
// (padNote.rules.js, padScenario.rules.js, padScreen.rules.js, padAutomation.rules.js), so "Add this example" drops a note that works.
// Colours are the Pad's own (sketch.js COLOURS), in the order of the swatches.
// ===========================================

export const KINDS = [
  {
    colour: 'blue', name: 'Command', purpose: 'Something a person (or an automation) asks the system to do. A frame with one is a command slice.',
    format: ['First line: its name', '- one field per line', '(a note) after a field goes to the slice\'s description'],
    example: 'Attempt Recall Booking\n- cycleId\n- primaryWindow (20-50 days)'
  },
  {
    colour: 'orange', name: 'Event', purpose: 'Something that happened, in the past tense. The events of a frame are what its command records.',
    format: ['First line: its name', '- one field per line', 'A value after a field ("- contractNumber: 99999") makes it an example of the event, not its definition: it adds no fields', 'An event another system records: end the name with (external) or start it with external: — drawn yellow, made an external event'],
    example: 'Booking Recalled\n- cycleId'
  },
  {
    colour: 'green', name: 'View', purpose: 'A read model: what the system can answer, built from events. A frame with one is a view slice.',
    format: ['First line: its name', '- one field per line; products[] is a list'],
    example: 'Products In Basket\n- products[]'
  },
  {
    colour: 'red', name: 'Hotspot', purpose: 'A question or a risk. Make chapter turns it into an open comment on the slice.',
    format: ['Any text: the question, then what to do about it'],
    example: 'Is the window right?\nask ops'
  },
  {
    colour: 'white', name: 'Note', purpose: 'A plain note. Make chapter adds it to the slice\'s description.',
    format: ['Any text'],
    example: 'Phone bookings too'
  },
  {
    colour: 'scenario', name: 'Scenario', purpose: 'A Given / When / Then example of one slice. Make chapter adds it as a scenario.',
    format: [
      'First line: its name (* or ★ marks a must-have)',
      'G: events that happened (Given), W: the command (When), T: the event it records (Then); A: or &: goes on with the line before',
      'Values in brackets: Product Removed (frameId: F1)',
      'T: rejected: why, or T: nothing: why, for a refusal or no change',
      'On a view: Q: name = a* is the query, then T: rows, one "- name: anna" a line'
    ],
    example: '* Two products in the basket\nG: Product Configured and Basket Opened\nW: Remove product (frameId: F1)\nT: Product Removed (frameId: F1)'
  },
  {
    colour: 'screen', name: 'Screen', purpose: 'A low-fi window. One screen is shown in every slice it touches: its inputs feed commands, it displays views.',
    format: ['First line: the screen\'s name', '{ Product List } shows that view (add : fields to list some)', '[ Selected ] is an input, a field of the command', '( Add ) is a button that sends the command called that'],
    example: 'Basket\n{ Product List }\n[ Selected ] ( Add )'
  },
  {
    colour: 'automation', name: 'Automation', purpose: 'A policy: it reads a view, then triggers a command or translates into an event of its own. A frame with one is an automation slice.',
    format: ['First line: its name', 'reads Reminders Due: the view it reads (required)', '→ Send Reminder: the command it triggers, or the event it translates into (-> works too)'],
    example: 'Send reminder\nreads Reminders Due\n→ Send Reminder'
  },
  {
    colour: 'arrow', name: 'Chapter arrow', purpose: 'A heading over a run of slices, as in classic event modeling: for the eye only. Make chapter ignores it, and so does everything else that reads the Pad.',
    format: ['One line: the chapter\'s heading', 'Drag the handle at its head to make it longer or shorter'],
    example: 'Ordering'
  }
];

// The Pad in short
export const RULES = [
  'A frame is a slice: draw one round a command (or a view, or an automation) with its events and scenarios. One command, view or automation to a frame.',
  'A row of example notes (events with values, left to right, with a blue command or a green view) is a scenario: select them and Make scenario… writes the Given / When / Then in a grey note; on a scenario note, Lay out as notes draws it as the row again.',
  '🔗 Link copy puts the same note in another place: edit one and they all say it.',
  '＋ Events takes a pasted list, one event note per line.',
  'Make chapter… builds the selected frames into a chapter of the board; Update chapter carries later changes over.',
  'Drag on empty canvas selects (▭ Select) or pans (✋ Pan); Space + drag or the scroll wheel pans; two fingers or ctrl + wheel zoom.',
  'Double-click (or double-tap) for a note; drag a colour from the strip for one of that colour; tap a colour to recolour the selection.'
];
