// ===========================================
// FIELD SOURCES - How the counts are worded (pure: parts and the agent tools say it the same way)
// ===========================================

// "3 fields with no source"
export const noSourceText = n => `${n} ${n === 1 ? 'field' : 'fields'} with no source`;
// "1 sticky to tidy"
export const tidyText = n => `${n} ${n === 1 ? 'sticky' : 'stickies'} to tidy`;
// "3 fields with no source · 1 sticky to tidy" (what there is to say; empty when nothing)
export const completenessText = (noSource, tidy) => [noSource && noSourceText(noSource), tidy && tidyText(tidy)].filter(Boolean).join(' · ');
