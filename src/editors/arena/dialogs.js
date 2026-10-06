// Arena Builder dialogs (in-page modals from the kit; no confirm / alert / prompt): shortcuts, leave, resize, save-as, the library
// (My Arenas + templates), import (paste box or file, with a preview) and export (code, size class, copy, download). Each returns a Promise.

import { generateArena } from '../../world/gen.js';
import { SIZES } from '../../world/arena.js';
import { ValidationError, MAX_CODE, sizeClass, exportArena, importArena } from './docs.js';
import { LIMITS, OBJECTIVE_BY_ID, SIZE_ORDER } from './consts.js';

const kb = (n) => n.toLocaleString('en-US');

export function showShortcuts(app) {
  const { K, S } = app;
  const body = K.h('div', { class: 'vw-ed__shortcuts' }, K.h('p', { class: 'vw-ed__note', text: S.dialogs.shortcutsNote }),
    ...S.shortcuts.map((g) => K.h('section', { class: 'vw-ed__sc-group' }, K.h('h3', { class: 'vw-label', text: g.group }), K.h('dl', { class: 'vw-ed__sc' }, ...g.rows.flatMap(([keys, what]) => [K.h('dt', {}, ...keys.split(' ').filter((k) => k !== '+' && k).map((k) => (/^[A-Za-z0-9\[\]/?\-]+$/.test(k) || k === '-' ? K.kbd(k) : K.h('span', { class: 'vw-ed__sc-sep', text: k })))), K.h('dd', { text: what })])))));
  return K.modal({ title: S.dialogs.shortcutsTitle, icon: 'keyboard', wide: true, body, buttons: [{ label: S.common.close, variant: 'primary', value: true, id: 'ed-sc-close' }] });
}

export function askLeave(app) {
  const { K, S } = app, D = S.dialogs;
  return K.modal({ title: D.leaveTitle, icon: 'warning', body: D.leaveText, dismissValue: 'cancel', focus: 'cancel',
    buttons: [{ label: S.common.cancel, variant: 'secondary', value: 'cancel', cancel: true, id: 'ed-leave-cancel' }, { label: D.leaveDiscard, variant: 'danger', value: 'discard', id: 'ed-leave-discard' }, { label: D.leaveKeep, variant: 'secondary', value: 'keep', id: 'ed-leave-keep' }, { label: D.leaveSave, variant: 'primary', value: 'save', id: 'ed-leave-save' }] });
}

export function askResize(app, fromCells, toCells, things) {
  const { K, S } = app, D = S.dialogs, nm = (c) => (SIZE_ORDER.find((k) => SIZES[k] === c) ? S.bar.sizes[SIZE_ORDER.find((k) => SIZES[k] === c)] : S.bar.custom(c));
  return K.ask({ title: D.resizeTitle, text: D.resizeText(nm(fromCells), nm(toCells), things), yes: D.resizeYes, no: S.common.cancel, danger: true });
}

export function askDiscardForNew(app) { const { K, S } = app; return K.ask({ title: S.dialogs.newTitle, text: S.dialogs.newDirty, yes: S.dialogs.newTitle, no: S.common.cancel, danger: true }); }

/** Single text field prompt (rename / save as). Resolves the trimmed text or null. */
export function askName(app, { title, value, ok, label }) {
  const { K, S } = app;
  const input = K.h('input', { class: 'vw-input', id: 'ed-name-input', type: 'text', maxlength: LIMITS.nameMax, 'aria-label': label || S.dialogs.saveName, value: value || '', autocomplete: 'off', spellcheck: 'false' });
  const err = K.h('p', { class: 'vw-note vw-note--bad vw-hide', role: 'alert' });
  return K.modal({ title, icon: 'save', dismissValue: null, body: () => K.h('div', { class: 'vw-col' }, K.h('label', { class: 'vw-label', for: 'ed-name-input', text: label || S.dialogs.saveName }), input, err),
    buttons: [{ label: S.common.cancel, value: null, cancel: true, id: 'ed-name-cancel' }, { label: ok || S.common.save, variant: 'primary', keep: true, id: 'ed-name-ok', onClick: (api) => { const v = input.value.replace(/[\u0000-\u001f]/g, ' ').trim(); if (v.length < LIMITS.nameMin || v.length > LIMITS.nameMax) { err.textContent = S.checks.issues.name_length({ length: v.length }); err.classList.remove('vw-hide'); app.sfx('ui_error'); input.focus(); return; } api.close(v); } }] }).then((v) => (typeof v === 'string' ? v : null));
}

export function offerDraft(app, info) {
  const { K, S } = app, D = S.dialogs;
  return K.modal({ title: D.draftTitle, icon: 'save', body: D.draftText(info.name, S.ago(Date.now() - info.savedAt)), dismissValue: 'fresh',
    buttons: [{ label: D.draftFresh, variant: 'secondary', value: 'fresh', id: 'ed-draft-fresh' }, { label: D.draftContinue, variant: 'primary', value: 'continue', primary: true, id: 'ed-draft-continue' }] });
}

// ---------------------------------------------------------------------------------------------------------------- library
function thumbImg(K, src, cls) { const im = K.h('img', { class: cls || 'vw-ed__thumb', alt: '', width: 192, height: 108 }); if (src) im.src = src; else im.classList.add('is-empty'); return im; }

/**
 * Library / template chooser. tab: 'mine' | 'templates'. Resolves one of
 *   {action:'open', item} | {action:'template', id, size, seed} | {action:'import'} | null.
 */
export function openLibrary(app, tab = 'mine') {
  const { K, S, ctx } = app, D = S.dialogs;
  const lib = app.lib, presets = (ctx.content.arenas || []);
  let cur = tab, size = 'medium';
  const body = (api) => {
    const wrap = K.h('div', { class: 'vw-ed__lib' });
    const tabs = K.tabs([{ id: 'mine', label: D.libMine, icon: 'folder' }, { id: 'templates', label: D.newTemplates, icon: 'map' }], { value: cur, label: D.libTitle, id: 'ed-lib-tabs', onChange: (id) => { cur = id; paint(); } });
    const area = K.h('div', { class: 'vw-ed__lib-area vw-scroll', id: 'ed-lib-area' });
    function paintMine() {
      const items = lib.list();
      const head = K.h('div', { class: 'vw-row vw-between' }, K.h('span', { class: 'vw-label', text: D.libCount(items.length) }), K.button(D.libImport, { id: 'ed-lib-import', size: 'sm', icon: 'download', variant: 'ghost', onClick: () => api.close({ action: 'import' }) }));
      if (!items.length) { area.replaceChildren(head, K.emptyState({ icon: 'folder', title: D.libTitle, text: D.libEmpty, action: { label: D.newTemplates, variant: 'primary', id: 'ed-lib-to-templates', onClick: () => { tabs.select('templates'); } } })); return; }
      const list = K.h('ul', { class: 'vw-ed__lib-list' });
      for (const it of items) {
        const sizeKey = SIZE_ORDER.find((k) => SIZES[k] === it.size), meta = [sizeKey ? S.bar.sizes[sizeKey] : S.bar.custom(it.size), S.markers.objectives[it.objective] || '', D.libSaved(S.ago(Date.now() - (it.updated || 0)))].filter(Boolean).join(' · ');
        const name = K.h('div', { class: 'vw-card__name', text: it.name });
        const row = K.h('li', { class: 'vw-ed__lib-item', dataset: { id: it.id } }, thumbImg(K, it.thumb), K.h('div', { class: 'vw-grow' }, name, K.h('div', { class: 'vw-small vw-dim', text: meta }), it.tags && it.tags.length ? K.h('div', { class: 'vw-chips' }, ...it.tags.map((t) => K.chip(t, { variant: 'sky' }))) : null),
          K.h('div', { class: 'vw-ed__lib-actions' },
            K.button(D.libOpen, { size: 'sm', variant: 'primary', id: 'ed-lib-open-' + it.id, onClick: () => api.close({ action: 'open', item: it }) }),
            K.iconButton('brush', S.common.rename + ' ' + it.name, { size: 'sm', id: 'ed-lib-rename-' + it.id, onClick: async () => { const nn = await askName(app, { title: D.libRenameTitle, value: it.name, ok: S.common.rename }); if (nn) { lib.rename(it.id, nn); paintMine(); } } }),
            K.iconButton('copy', S.common.duplicate + ' ' + it.name, { size: 'sm', id: 'ed-lib-dup-' + it.id, onClick: async () => { await lib.duplicate(it.id); paintMine(); } }),
            K.iconButton('upload', S.common.export + ' ' + it.name, { size: 'sm', id: 'ed-lib-export-' + it.id, onClick: async () => { try { const r = await lib.open(it); await exportDialog(app, r.arena, { objective: r.objective, tags: r.tags }); } catch (e) { app.toast(e.message || String(e), 'error'); } } }),
            K.iconButton('trash', S.common.delete + ' ' + it.name, { size: 'sm', variant: 'danger', id: 'ed-lib-del-' + it.id, onClick: async () => { if (await K.ask({ title: D.libDeleteTitle, text: D.libDeleteText(it.name), yes: S.common.delete, danger: true })) { lib.remove(it.id); paintMine(); } } })));
        list.appendChild(row);
      }
      area.replaceChildren(head, list, K.h('p', { class: 'vw-ed__note', text: D.libOpenDirty }));
    }
    function paintTemplates() {
      const sizeSeg = K.segmented({ id: 'ed-new-size', label: D.newSize, value: size, options: SIZE_ORDER.map((k) => ({ value: k, label: S.bar.sizes[k], sub: S.bar.sizeSub[k] })), onChange: (v) => { size = v; } });
      const grid = K.h('div', { class: 'vw-ed__tpl-grid' });
      const mk = (id, name, blurb, thumb, recipe, defSize, seed) => {
        const img = thumbImg(K, ''), card = K.h('button', { type: 'button', class: 'vw-ed__tpl', id: 'ed-tpl-' + id, 'aria-label': `${name}. ${blurb}` }, img, K.h('span', { class: 'vw-ed__tpl-n', text: name }), K.h('span', { class: 'vw-ed__tpl-b', text: blurb }));
        card.addEventListener('click', () => { K.sfx('ui_confirm'); api.close({ action: 'template', id, recipe, size: id === 'arenalab' ? size : size, seed: id === 'random' ? 1 + Math.floor(Math.random() * 999999) : seed }); });
        if (thumb) { let v = ''; try { v = ctx.content.arenaThumb(thumb); } catch (e) { v = ''; } if (v && typeof v.then === 'function') v.then((u) => { if (u) { img.src = u; img.classList.remove('is-empty'); } }, () => {}); else if (v) { img.src = v; img.classList.remove('is-empty'); } }
        grid.appendChild(card);
      };
      mk('arenalab', D.newBlank, D.newBlankSub, 'arenalab', 'arenalab', 'medium', 1);
      for (const p of presets) if (p.id !== 'arenalab') mk(p.id, p.name, p.blurb, p.id === 'random' ? '' : p.id, p.recipe, p.size, p.seed);
      area.replaceChildren(K.h('div', { class: 'vw-ed__lib-head' }, K.field(D.newSize, sizeSeg), K.h('p', { class: 'vw-ed__note', text: D.newReplace })), grid);
    }
    function paint() { (cur === 'mine' ? paintMine : paintTemplates)(); }
    wrap.append(tabs, area); paint();
    return wrap;
  };
  const shown = K.modal({ title: cur === 'mine' ? D.libTitle : D.newTitle, icon: 'folder', wide: true, class: 'vw-ed__libmodal', id: 'ed-library', body, dismissValue: null, buttons: [{ label: S.common.close, variant: 'secondary', value: null, cancel: true, id: 'ed-lib-close' }] });
  const active = document.querySelector('#ed-lib-tabs [aria-selected="true"]'); if (active) active.focus();   // the kit focuses the first tab: start on the one that is showing
  return shown;
}

// ---------------------------------------------------------------------------------------------------------------- export
export async function exportDialog(app, arena, meta) {
  const { K, S, ctx } = app, D = S.dialogs;
  let res;
  try { res = await exportArena(arena, meta); } catch (e) { app.toast(e.message || String(e), 'error'); return null; }
  const ta = K.h('textarea', { class: 'vw-input vw-ed__code', id: 'ed-export-code', rows: 6, readonly: true, spellcheck: 'false', 'aria-label': D.exportCode });
  const tooLong = res.length > MAX_CODE;
  ta.value = tooLong ? '' : res.code;
  const filename = (String(arena.name || 'arena').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'arena') + '.vwarena';
  const info = K.h('div', { class: 'vw-row vw-wrapflex' }, K.chip(tooLong ? D.exportTooLong(res.length) : D.exportLength(res.length, res.cls), { variant: tooLong ? 'danger' : res.cls === 'S' ? 'olive' : res.cls === 'M' ? 'gold' : 'lava', id: 'ed-export-size' }));
  const hasDownload = !!(ctx.platform && ctx.platform.downloads && typeof ctx.platform.downloads.save === 'function');
  const note = K.h('p', { class: 'vw-ed__note', id: 'ed-export-note', text: tooLong ? D.exportFileOnly : (hasDownload ? '' : D.exportNoDownload) });
  const copy = K.button(D.exportCopy, { id: 'ed-export-copy', icon: 'copy', variant: 'primary', onClick: async () => { if (tooLong) return; const ok = await (ctx.platform && ctx.platform.clipboard ? ctx.platform.clipboard(res.code) : Promise.resolve(false)); if (ok) app.toast(S.toast.copied, 'success'); else { ta.focus(); ta.select(); app.toast(S.toast.copyFailed, 'warn'); } } });
  if (tooLong) copy.setDisabled(true);
  const select = K.button(D.exportSelect, { id: 'ed-export-select', size: 'sm', variant: 'ghost', onClick: () => { ta.focus(); ta.select(); } });
  if (tooLong) select.setDisabled(true);
  const dl = K.button(D.exportDownload, { id: 'ed-export-download', icon: 'download', variant: tooLong ? 'primary' : 'secondary', onClick: async () => { try { const r = hasDownload ? await ctx.platform.downloads.save(filename, res.code) : null; if (r === false) { app.toast('Not saved. The code is still in the box above: copy it from there.', 'info'); return; } app.toast(D.exportDownloaded(filename), 'success'); } catch (e) { app.toast('This page could not save a file. Copy the code from the box above instead.', 'error'); } } });
  if (!hasDownload) dl.setDisabled(true);
  return K.modal({ title: D.exportTitle, icon: 'upload', wide: true, id: 'ed-export', body: K.h('div', { class: 'vw-col' }, info, note, ta, K.h('div', { class: 'vw-row vw-wrapflex' }, copy, dl, select)), buttons: [{ label: S.common.close, variant: 'secondary', value: true, cancel: true, id: 'ed-export-close' }] });
}

// ---------------------------------------------------------------------------------------------------------------- import
/** Paste box + file picker + preview. Resolves {arena, objective, tags, notes} or null. */
export function importDialog(app) {
  const { K, S, ctx } = app, D = S.dialogs;
  let result = null;
  const ta = K.h('textarea', { class: 'vw-input vw-ed__code', id: 'ed-import-code', rows: 6, spellcheck: 'false', placeholder: D.importPh, 'aria-label': D.importPaste });
  const status = K.h('p', { class: 'vw-note vw-hide', id: 'ed-import-status', role: 'status', 'aria-live': 'polite' });
  const preview = K.h('div', { class: 'vw-ed__preview vw-hide', id: 'ed-import-preview' });
  let acceptBtn = null;
  const setStatus = (msg, kind) => { status.textContent = msg || ''; status.className = 'vw-note' + (kind ? ' vw-note--' + kind : '') + (msg ? '' : ' vw-hide'); };
  async function check() {
    result = null; preview.classList.add('vw-hide'); if (acceptBtn) acceptBtn.setDisabled(true);
    const text = ta.value.trim();
    if (!text) { setStatus(D.importEmpty, 'warn'); return false; }
    setStatus(D.importReading);
    try {
      const r = await importArena(text); result = r;
      const a = r.arena, sk = SIZE_ORDER.find((k) => SIZES[k] === a.size);
      preview.replaceChildren(K.h('div', { class: 'vw-card__name', text: a.name }), K.h('div', { class: 'vw-small', text: D.importInfo(a.name, sk ? S.bar.sizes[sk] : S.bar.custom(a.size), a.props.length, a.hazards.length, a.markers.length) }),
        K.h('div', { class: 'vw-chips' }, K.chip(S.markers.objectives[r.objective], { variant: 'gold' }), ...r.tags.map((t) => K.chip(t, { variant: 'sky' }))), ...(r.notes.length ? [K.h('div', { class: 'vw-label', text: D.importNotes }), K.h('ul', { class: 'vw-ed__notes' }, ...r.notes.map((n) => K.h('li', { text: n })))] : []));
      preview.classList.remove('vw-hide'); setStatus(D.importPreview, 'ok'); if (acceptBtn) acceptBtn.setDisabled(false); return true;
    } catch (e) { setStatus(e instanceof ValidationError ? e.message : 'That code could not be read.', 'bad'); return false; }
  }
  const file = K.button(D.importFile, { id: 'ed-import-file', icon: 'folder', size: 'sm', onClick: async () => { try { const f = await (ctx.platform && ctx.platform.pickFile ? ctx.platform.pickFile('.vwarena,.txt,text/plain') : Promise.resolve(null)); if (!f) return; if (f.size > 400000) { setStatus('Too long: ' + kb(f.size) + ' > 400,000 characters', 'bad'); return; } ta.value = await f.text(); await check(); } catch (e) { setStatus('The file could not be read.', 'bad'); } } });
  const checkBtn = K.button(D.importCheck, { id: 'ed-import-check', icon: 'check', size: 'sm', variant: 'secondary', onClick: check });
  return K.modal({ title: D.importTitle, icon: 'download', wide: true, id: 'ed-import', dismissValue: null,
    body: K.h('div', { class: 'vw-col' }, K.h('label', { class: 'vw-label', for: 'ed-import-code', text: D.importPaste }), ta, K.h('div', { class: 'vw-row vw-wrapflex' }, checkBtn, file, K.h('span', { class: 'vw-small vw-dim', text: D.importFileHint })), status, preview),
    buttons: [{ label: S.common.cancel, value: null, cancel: true, id: 'ed-import-cancel' }, { label: D.importAccept, variant: 'primary', keep: true, id: 'ed-import-accept', onClick: async (api) => { if (!result && !(await check())) { app.sfx('ui_error'); return; } api.close(result); } }] });
}

/** Template -> {arena, objective}. */
export function arenaFromTemplate(res, content) {
  const recipe = res.recipe || 'arenalab';
  const a = generateArena(recipe, res.size || 'medium', res.seed || 1);
  const p = (content.arenas || []).find((x) => x.id === res.id);
  a.name = res.id === 'arenalab' ? 'Untitled Arena' : (p ? p.name : a.name).slice(0, LIMITS.nameMax);
  a.author = 'You'; a.desc = '';
  void OBJECTIVE_BY_ID; void sizeClass;
  return { arena: a, objective: 'eliminate' };
}
