// Fatal-error panel: cause (WebGL 2 / library load / unknown), what to try, copyable diagnostics, safe-mode retry.
// renderFatal(host, info) works with NO ctx and NO prior K.init, so the boot code can call it when startup fails.
//   info: { kind: 'webgl2'|'cdn'|'unknown', cause?, message?, diagnostics?: string|object, onSafeMode?(), onReload?() }
import * as K from '../kit.js';
import { T as DEFAULT_T, getT } from '../strings.js';

export const meta = { id: 'fatal', layer: 'menu', music: 'none', canvas: 'none' };

function diagText(d) {
  if (d == null) return '';
  if (typeof d === 'string') return d;
  try { return JSON.stringify(d, null, 2); } catch (e) { return String(d); }
}

/** Copy with fallbacks: Clipboard API -> execCommand on a selected textarea -> user copies manually (text stays selected). */
async function copyInline(textarea) {
  const text = textarea.value;
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* fall through */ }
  try { textarea.focus(); textarea.select(); if (document.execCommand && document.execCommand('copy')) return true; } catch (e) { /* fall through */ }
  textarea.focus(); textarea.select();
  return false;
}

export function renderFatal(host, info, ctx) {
  info = info || {};
  const T = ctx ? getT(ctx).fatal : DEFAULT_T.fatal;
  const kind = info.kind && T[info.kind] ? info.kind : 'unknown';
  const k = T[kind];
  const cause = info.cause || k.cause;
  const ta = K.h('textarea', { class: 'vw-input vw-fatal__diag-ta', id: 'fatal-diag', readonly: true, rows: 7, 'aria-label': T.reportHint, spellcheck: 'false' });
  ta.value = [info.message ? 'message: ' + info.message : '', diagText(info.diagnostics)].filter(Boolean).join('\n');
  const status = K.h('p', { class: 'vw-small vw-fatal__status', role: 'status', 'aria-live': 'polite' });
  const copyBtn = K.button(T.copyDiag, { icon: 'copy', variant: 'primary', id: 'fatal-copy', onClick: async () => { const ok = await copyInline(ta); status.textContent = ok ? T.copied : 'Your browser blocked copying. The text is selected: press Ctrl/Cmd+C.'; } });
  const reloadBtn = K.button(T.retry, { icon: 'refresh', variant: 'secondary', id: 'fatal-reload', onClick: () => { if (info.onReload) info.onReload(); else window.location.reload(); } });
  const btns = [copyBtn, reloadBtn];
  if (kind !== 'webgl2') {
    btns.push(K.button(T.safe, { icon: 'shield', variant: 'secondary', id: 'fatal-safe', onClick: () => {
      if (info.onSafeMode) { info.onSafeMode(); return; }
      try { window.localStorage.setItem('vw.safe', '1'); } catch (e) { /* storage may be blocked */ }
      window.location.reload();
    } }));
  }
  const panel = K.tablet(T.title, K.h('div', { class: 'vw-col' },
    K.h('div', { class: 'vw-fatal__cause', role: 'alert', text: cause }),
    info.message ? K.h('p', { class: 'vw-dim', text: info.message }) : null,
    K.h('div', { class: 'vw-label', text: T.whatNow }),
    K.h('ol', {}, ...k.steps.map((s) => K.h('li', { text: s }))),
    K.h('p', { class: 'vw-note', id: 'fatal-safe-hint', text: T.safeHint + (kind === 'webgl2' ? ' (Not available here: it needs WebGL 2 too.)' : '') }),
    K.h('div', { class: 'vw-label', text: T.reportHint }), ta,
    K.h('div', { class: 'vw-row vw-wrapflex' }, ...btns), status), { id: 'fatal-panel', icon: 'warning' });
  panel.classList.add('vw-fatal__panel');
  const el = K.h('div', { class: 'vw-fatal', id: 'vw-fatal', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'fatal-panel-t' }, panel);
  host.appendChild(el);
  setTimeout(() => { try { copyBtn.focus(); } catch (e) { /* ignore */ } }, 30);
  return el;
}

export function mount(root, ctx, params) {
  K.init(ctx);
  const el = renderFatal(root, params || {}, ctx);
  return K.withExit(root, { destroy() { el.remove(); }, onBack() { return true; } });
}
