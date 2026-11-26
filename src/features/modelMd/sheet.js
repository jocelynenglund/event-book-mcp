// ===========================================
// MODEL.MD - The sheets and the taps (feature: model-md)
// ☰ → Import model.md (a file or pasted text) → the report; ☰ → Export… → model.md; and a .md picked in ☰ → Import…
// that is a model.md. Draws through modelMd.parts.js from the views; the book is read here once, to hand the report its view.
// ===========================================

import { getCurrentModelId } from '../../core/eventStore.js';
import { showToast } from '../../ui/toast.js';
import { render, showOutline } from '../../ui/feed.js';
import { openBoardSheet } from '../board/sheets/shared.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { importModelMd, looksLikeModelMd } from './modelMd.command.js';
import { importReportNow } from './importReport.read.js';
import { pasteForm, exportOptions, exportDownload } from './modelMdForms.read.js';
import { importReportSheet, pasteSheet, exportOptionLines } from './modelMd.parts.js';
import { ensureModelMdStyles } from './modelMd.styles.js';

// The ☰ → Export… lines (in the sheet's template)
export function modelMdExportOptions() { ensureModelMdStyles(); return exportOptionLines(exportOptions()); }

// Read it, build it as a new book, show what was found. Returns true when a book was made
export function runImport({ markdown, fileName }) {
  ensureModelMdStyles();
  let result;
  try { result = importModelMd({ markdown, fileName }); } catch (err) { showToast("Couldn't import that model.md"); return false; }
  if (result.refused) { showToast(result.refused); return false; }
  hideAllSheets();
  render();
  showOutline();
  openBoardSheet(importReportSheet(importReportNow(result)));
  return getCurrentModelId() === result.id;
}

export function openModelMdImport() {
  ensureModelMdStyles();
  openBoardSheet(pasteSheet(pasteForm()), 'mmText');
}

export function modelMdPicked(input) {
  const file = input.files[0];
  if (!file) return;
  file.text().then(markdown => runImport({ markdown, fileName: file.name })).catch(() => showToast("Couldn't read that file")).finally(() => { input.value = ''; });
}

// A .md picked in ☰ → Import…: a model.md becomes a book; anything else is a draft, as before. Always handles the file.
export function modelMdFile(file, input, importDraft) {
  file.text().then(markdown => {
    if (looksLikeModelMd(markdown)) { runImport({ markdown, fileName: file.name }); input.value = ''; return; }
    return importDraft(file).catch(() => showToast("Couldn't import that draft")).finally(() => { input.value = ''; });
  }).catch(() => { showToast("Couldn't read that file"); input.value = ''; });
  return true;
}

export function exportModelMd(notation = 'v1.1') {
  const file = exportDownload(notation);
  if (!file) { showToast('Nothing to export yet'); return; }
  const url = URL.createObjectURL(new Blob([file.text], { type: 'text/markdown' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  showToast(notation === 'v1' ? 'Exported as model.md (plain v1)' : 'Exported as model.md');
}

// Taps in the board's sheets
export function onSheetAction(a) {
  if (a !== 'mm-import') return false;
  const markdown = document.getElementById('mmText')?.value || '';
  runImport({ markdown, fileName: '' });
  return true;
}

export const modelMdActions = { openModelMdImport, modelMdPicked, exportModelMd };
