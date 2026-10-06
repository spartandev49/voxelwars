// Workshop dialogs built on the kit's in-page modals (no alert/confirm/prompt): share, import, the roster library, rename, shortcuts.
import * as K from '../../ui/kit.js';
import { encodeShare, importShare, MAX_CODE } from '../../save/share.js';
import { ValidationError } from '../../save/validate.js';
import { customDef, compileFromDef, CLASS_LABEL, weaponStyleOf, mainEntry, LIBRARY_CAP, NAME_MAX } from '../../content/era_ancient/custom.js';
import { WS } from './text.js';

const h = K.h;
const guard = (fn, d) => { try { const v = fn(); return v === undefined ? d : v; } catch (e) { return d; } };
const fileName = (name, ext) => (String(name).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || 'soldier') + ext;

/** The share dialog: the code with its length and size class, copy, download (platform.downloads when present, else the code to copy by hand). */
export async function openShare(ctx, cs) {
  let enc;
  try { enc = await encodeShare('soldier', cs); } catch (e) { K.toast('That soldier could not be turned into a code: ' + ((e && e.message) || 'unknown problem'), { kind: 'error' }); return; }
  const dl = guard(() => ctx.platform.downloads, null);
  const ta = h('textarea', { class: 'vw-input ws-code', rows: 6, readonly: true, spellcheck: 'false', 'aria-label': WS.shareTitle, id: 'ws-share-code' });
  ta.value = enc.tooLong ? '' : enc.code;
  const info = h('div', { class: 'vw-row vw-wrapflex' }, K.chip(WS.shareLen(enc.length, enc.cls), { variant: enc.tooLong ? 'danger' : enc.cls === 'L' ? 'lava' : 'olive', id: 'ws-share-len' }), K.chip(cs.name, { variant: 'ink', icon: 'users' }));
  const warn = enc.tooLong ? K.note(WS.shareTooLong(enc.length), 'bad') : null;
  const doDownload = async () => {
    const name = fileName(cs.name, '.vwsoldier');
    if (dl && typeof dl.save === 'function') { try { await dl.save(name, enc.code); K.toast(WS.downloaded(name), { kind: 'success' }); return; } catch (e) { /* fall through to the text fallback */ } }
    K.toast(WS.downloadFallback, { kind: 'info', ms: 5200 }); ta.value = enc.code; ta.focus(); ta.select();
  };
  await K.modal({
    title: WS.shareTitle, wide: true, id: 'ws-share-modal', icon: 'upload',
    body: () => h('div', { class: 'vw-col' }, info, warn, ta),
    buttons: [{ label: 'Close', variant: 'secondary', value: null, cancel: true },
      { label: WS.download, variant: 'secondary', icon: 'download', keep: true, id: 'ws-share-download', onClick: doDownload },
      enc.tooLong ? null : { label: WS.copy, variant: 'primary', icon: 'copy', keep: true, id: 'ws-share-copy', onClick: () => { K.copyText(enc.code, { done: WS.copied }); } }].filter(Boolean),
  });
}

/**
 * The import dialog: paste or pick a file, strict validation with plain-English errors, a preview, then accept.
 * Resolves the validated soldier or null. `unlocked` enforces part availability (the campaign locks of the current profile).
 */
export function openImport(ctx, { unlocked, existing, makeThumb } = {}) {
  let parsed = null;
  const ta = h('textarea', { class: 'vw-input ws-code', rows: 6, spellcheck: 'false', autocomplete: 'off', 'aria-label': WS.importPaste, placeholder: 'VW1.soldier....', id: 'ws-import-code' });
  const err = h('p', { class: 'vw-note vw-note--bad vw-hide', role: 'alert', id: 'ws-import-error' });
  const preview = h('div', { class: 'ws-import-preview vw-hide', id: 'ws-import-preview' });
  const showErr = (m) => { err.textContent = m || ''; err.classList.toggle('vw-hide', !m); };
  let primary = null;
  const check = async () => {
    showErr(''); preview.classList.add('vw-hide'); parsed = null; if (primary) primary.setLabel(WS.importOk);
    const text = ta.value.trim(); if (!text) { showErr('Paste a code first. The code is the long line starting with VW1.soldier.'); return false; }
    try {
      const r = await importShare(text, 'soldier', { unlocked });
      parsed = r.value; const def = customDef(parsed);
      const warns = parsed.warnings || [];
      preview.replaceChildren(
        h('div', { class: 'vw-row ws-import-row' }, makeThumb ? guard(() => { const u = makeThumb(parsed); return u ? h('img', { class: 'ws-thumb', src: u, alt: '', width: 72, height: 72 }) : null; }, null) : null,
          h('div', { class: 'vw-col vw-grow' }, h('div', { class: 'vw-display ws-import-name', text: parsed.name }), h('div', { class: 'vw-row vw-wrapflex' }, K.chip(WS.cost(def.cost), { variant: 'gold', icon: 'coin' }), K.chip(CLASS_LABEL[weaponStyleOf(parsed.blueprint)] || '', { variant: 'sky' }), K.chip(mainEntry(parsed.blueprint).name, { variant: 'ink' })))),
        warns.length ? h('div', { class: 'vw-col' }, h('div', { class: 'vw-label', text: WS.importWarn(warns.length) }), h('ul', { class: 'ws-list' }, ...warns.slice(0, 6).map((w) => h('li', { text: w })))) : null);
      preview.classList.remove('vw-hide'); if (primary) primary.setLabel(WS.importAccept); return true;
    } catch (e) { showErr(e instanceof ValidationError ? e.message : 'That code could not be read: ' + ((e && e.message) || 'unknown problem')); K.sfx('ui_error'); return false; }
  };
  const pick = async () => {
    const file = await guard(() => ctx.platform.pickFile('.vwsoldier,.txt'), Promise.resolve(null));
    if (!file) return;
    if (file.size > 400000) { showErr(`That file is ${file.size.toLocaleString('en-US')} bytes; the limit is 400,000.`); return; }
    try { ta.value = (await file.text()).trim(); } catch (e) { showErr('That file could not be read.'); return; }
    check();
  };
  return K.modal({
    title: WS.importTitle, wide: true, id: 'ws-import-modal', icon: 'download', dismissValue: null,
    body: () => h('div', { class: 'vw-col' }, h('p', { text: WS.importNote }), ta, K.button(WS.importFile, { icon: 'folder', variant: 'ghost', size: 'sm', id: 'ws-import-file', onClick: pick }), err, preview),
    buttons: [{ label: 'Cancel', variant: 'secondary', value: null, cancel: true },
      { label: WS.importOk, variant: 'primary', keep: true, id: 'ws-import-ok', onClick: async (api) => { primary = primary || api.foot.querySelector('#ws-import-ok'); if (parsed) { api.close(parsed); return; } await check(); } }],
  }).then((v) => v || null);
}

/** Name prompt as a modal (replaces prompt()). Resolves the new name or null. */
export function askName(title, current, ok = 'OK') {
  const input = h('input', { type: 'text', class: 'vw-input', maxlength: String(NAME_MAX), value: current || '', 'aria-label': WS.name, id: 'ws-rename-input', autocomplete: 'off', spellcheck: 'false' });
  input.value = current || '';
  const err = h('p', { class: 'vw-note vw-note--bad vw-hide', role: 'alert' });
  return K.modal({
    title, id: 'ws-rename-modal', icon: 'brush', dismissValue: null,
    body: () => h('div', { class: 'vw-col' }, input, err),
    buttons: [{ label: 'Cancel', variant: 'secondary', value: null, cancel: true },
      { label: ok, variant: 'primary', keep: true, id: 'ws-rename-ok', onClick: (api) => { const v = input.value.replace(/\s+/g, ' ').trim(); if (!v) { err.textContent = 'A soldier needs a name (1-40 characters).'; err.classList.remove('vw-hide'); K.sfx('ui_error'); input.focus(); return; } api.close(v.slice(0, NAME_MAX)); } }],
  }).then((v) => (typeof v === 'string' ? v : null));
}

/** Keyboard shortcuts overlay. */
export function openHelp(title, rows) {
  return K.modal({
    title, id: 'ws-help-modal', icon: 'keyboard',
    body: () => h('dl', { class: 'ws-keys' }, ...rows.flatMap(([k, d]) => [h('dt', {}, K.kbd(k)), h('dd', { text: d })])),
    buttons: [{ label: 'Got it', variant: 'primary', value: true }],
  });
}

/**
 * The roster library. `env` supplies the actions: {ctx, list(), thumbFor(item) -> url, edit(item), duplicate(item), rename(item), remove(item), share(item), use(item), createNew()}.
 * Cards re-render in place after rename / duplicate / delete; edit, share and use close the dialog first.
 */
export function openLibrary(env) {
  const grid = h('div', { class: 'ws-lib', id: 'ws-lib-grid', role: 'list' });
  const count = h('div', { class: 'vw-label', id: 'ws-lib-count' });
  let api = null;
  const render = () => {
    const items = env.list(); count.textContent = WS.libraryCount(items.length);
    if (!items.length) { grid.replaceChildren(K.emptyState({ icon: 'users', title: WS.libraryTitle, text: WS.libraryEmpty })); return; }
    grid.replaceChildren(...items.map((it, i) => card(it, i)));
  };
  const close = (v) => { if (api) api.close(v); };
  const card = (it) => {
    const def = guard(() => customDef(it), null);
    const url = it.thumb || guard(() => env.thumbFor(it), '');
    const img = url ? h('img', { class: 'ws-thumb', src: url, alt: '', width: 96, height: 96 }) : h('div', { class: 'ws-thumb ws-thumb--empty' }, K.icon('users'));
    const btn = (label, icon, fn, variant = 'ghost') => K.button(label, { icon, size: 'sm', variant, onClick: fn, id: 'ws-lib-' + label.toLowerCase().replace(/[^a-z]+/g, '-') + '-' + it.id });
    return h('article', { class: 'ws-libcard vw-tablet vw-tablet--flat', role: 'listitem', dataset: { id: it.id }, 'aria-label': it.name },
      h('div', { class: 'ws-libcard__top' }, img, h('div', { class: 'vw-col vw-grow' }, h('h3', { class: 'ws-libcard__name', text: it.name }),
        h('div', { class: 'vw-row vw-wrapflex' }, def ? K.chip(WS.cost(def.cost), { variant: 'gold', icon: 'coin' }) : null, def ? K.chip(CLASS_LABEL[def.weaponStyle] || def.role, { variant: 'sky' }) : null))),
      h('div', { class: 'ws-libcard__acts' },
        btn(WS.edit, 'brush', () => { close(null); env.edit(it); }, 'primary'), btn(WS.use, 'sword', () => { close(null); env.use(it); }), btn(WS.duplicate, 'copy', () => { env.duplicate(it); render(); }),
        btn(WS.rename, 'scroll', async () => { await env.rename(it); render(); }), btn(WS.shareOne, 'upload', () => { close(null); env.share(it); }), btn(WS.del, 'trash', async () => { await env.remove(it); render(); }, 'danger')));
  };
  return K.modal({
    title: WS.libraryTitle, wide: true, id: 'ws-library-modal', icon: 'users', dismissValue: null,
    body: (a) => { api = a; render(); return h('div', { class: 'vw-col' }, h('div', { class: 'vw-row vw-between' }, count, K.button(WS.newSoldier, { icon: 'plus', size: 'sm', variant: 'secondary', id: 'ws-lib-new', onClick: () => { close(null); env.createNew(); } })), grid); },
    buttons: [{ label: 'Close', variant: 'secondary', value: null, cancel: true }],
  });
}
export { LIBRARY_CAP, MAX_CODE };
