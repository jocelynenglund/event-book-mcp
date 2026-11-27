// The event of the Screen Select feature (this folder is the feature: see README.md)
export const ScreenSelectEvents = {
  ScreenFieldSet: 'ScreenFieldSet'   // what a screen's field is: picks one or many from a view, is hidden, is required or optional { elementId, field, select: 'many' | 'one' | null, optionsFrom: view name | null, hidden: bool, required: true | false | null }
};
