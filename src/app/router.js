// Router: base screens (menu/battle/editor layers) replace each other; overlays stack on top. Screens follow docs/app_contract.md §1.
import { SCREEN_MODULES, EDITOR_MODULES } from '../_generated/registry.ui.js';
import { KIT } from '../_generated/registry.optional.js';

const TRANSIENT = new Set(['battle', 'splash']);

export class Router {
  /** @param {HTMLElement} ui container  @param {()=>object} getCtx  @param {Record<string,object>} fallbacks screen modules used when the UI agents' module is absent */
  constructor(ui, getCtx, fallbacks = {}) {
    this.ui = ui; this.getCtx = getCtx; this.fallbacks = fallbacks; this.base = null; this.overlays = []; this.history = []; this.listeners = [];
    this.mods = {};
    for (const set of [SCREEN_MODULES, EDITOR_MODULES || {}]) for (const k of Object.keys(set)) { const m = set[k]; if (!m || !m.mount) continue; const id = (m.meta && m.meta.id) || k; this.mods[id] = m; }
  }
  has(id) { return !!(this.mods[id] || this.fallbacks[id]); }
  _mod(id) { return this.mods[id] || this.fallbacks[id] || null; }
  onChange(fn) { this.listeners.push(fn); }
  current() { return this.base ? this.base.id : ''; }
  _mount(id, params, overlay) {
    const mod = this._mod(id);
    if (!mod || !mod.mount) { console.warn('router: no screen module for', id); return null; }
    const el = document.createElement('div'); el.className = 'vw-screen vw-screen-' + id + (overlay ? ' vw-overlay' : ''); el.dataset.screen = id;
    el.style.cssText = 'position:absolute;inset:0;' + (((mod.meta && mod.meta.layer) === 'battle') ? 'pointer-events:none;' : 'pointer-events:auto;');
    this.ui.appendChild(el);
    let inst = null;
    try { inst = mod.mount(el, this.getCtx(), params || {}) || {}; } catch (e) { console.error('screen mount failed:', id, e); el.remove(); if (this.getCtx().diag) this.getCtx().diag.error('screen', id + ': ' + (e && e.message)); return null; }
    return { id, el, inst, meta: mod.meta || {} };
  }
  _destroy(s) { if (!s) return; try { if (s.inst && s.inst.destroy) s.inst.destroy(); } catch (e) { console.warn('screen destroy failed', e); } s.el.remove(); }
  goto(id, params, o = {}) {
    for (const o of this.overlays.splice(0)) this._destroy(o);
    const prev = this.base ? this.base.id : null;
    this._destroy(this.base); this.base = null;
    // a modal belongs to the screen that opened it: it must not outlive that screen (the arena builder's "start a new arena" dialog used to stay on top of the workshop)
    try { if (KIT && KIT.closeModals) KIT.closeModals(); } catch (e) { console.warn('closeModals failed', e); }
    const s = this._mount(id, params, false);
    // the battle and the splash are never somewhere Back returns to (Tweak army -> Back used to land on the battle HUD with the game still in placement)
    this.base = s; if (prev && prev !== id && !o.noHistory && !TRANSIENT.has(prev)) this.history.push(prev); if (this.history.length > 20) this.history.shift();
    for (const f of this.listeners) f(id, params);
    return !!s;
  }
  overlay(id, params) { const s = this._mount(id, params, true); if (s) this.overlays.push(s); return !!s; }
  closeOverlay(id) { for (let i = this.overlays.length - 1; i >= 0; i--) if (!id || this.overlays[i].id === id) { this._destroy(this.overlays[i]); this.overlays.splice(i, 1); if (id) break; } }
  hasOverlay(id) { return this.overlays.some((o) => o.id === id); }
  /**
   * Back: the top overlay or the base screen may handle it (`inst.onBack() -> true`); otherwise the history is popped (never to the screen we are on), and with no history
   * a screen other than the title returns to the title. A screen's onBack that itself calls `nav.back()` (daily, survival did) re-enters here: the hooks are skipped on
   * the nested call so it performs the default step instead of recursing without end.
   */
  back() {
    const nested = this._inBack; this._inBack = true;
    try {
      if (this.overlays.length) { const top = this.overlays[this.overlays.length - 1]; if (!nested && top.inst && top.inst.onBack && top.inst.onBack()) return true; this.closeOverlay(top.id); return true; }
      if (!nested && this.base && this.base.inst && this.base.inst.onBack && this.base.inst.onBack()) return true;
      const cur = this.current(); let prev = null;
      while (this.history.length) { prev = this.history.pop(); if (prev !== cur) break; prev = null; }
      if (prev) { this.goto(prev, undefined, { noHistory: true }); return true; }
      if (cur && cur !== 'title' && cur !== 'splash' && this.has('title')) { this.goto('title', undefined, { noHistory: true }); return true; }
      return false;
    } finally { this._inBack = nested; }
  }
  key(e) { const top = this.overlays[this.overlays.length - 1] || this.base; return !!(top && top.inst && top.inst.onKey && top.inst.onKey(e)); }

  // --------------------------------------------------------------- toast + modal (kit versions preferred)
  toast(text, o = {}) {
    if (KIT && KIT.toast) { try { return KIT.toast(text, o, this.getCtx()); } catch (e) { /* fall through */ } }
    const t = document.createElement('div'); t.textContent = text; t.setAttribute('role', 'status');
    t.style.cssText = 'position:absolute;left:50%;top:14%;transform:translateX(-50%);background:#1d2150;color:#f3f6fb;border:3px solid #0b0d22;border-radius:10px;box-shadow:0 4px 0 #0b0d22;padding:8px 16px;font:500 14px Rubik,system-ui,sans-serif;z-index:50;pointer-events:none;max-width:90vw;text-align:center;' + (o.kind === 'error' ? 'border-color:#ff5d5d;' : '');
    this.ui.appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  modal(o) {
    if (KIT && KIT.modal) { try { return KIT.modal(o, this.getCtx()); } catch (e) { /* fall through */ } }
    return new Promise((resolve) => {
      const back = document.createElement('div'); back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true');
      back.style.cssText = 'position:absolute;inset:0;background:rgba(10,12,34,.65);display:flex;align-items:center;justify-content:center;padding:16px;z-index:60;pointer-events:auto';
      const card = document.createElement('div'); card.style.cssText = 'background:#1d2150;color:#f3f6fb;border:3px solid #0b0d22;border-radius:14px;box-shadow:0 6px 0 #0b0d22;padding:20px;max-width:480px;width:100%;font:15px Rubik,system-ui,sans-serif';
      const h = document.createElement('h2'); h.textContent = o.title || ''; h.style.cssText = 'margin:0 0 8px;font:400 20px Bungee,Impact,sans-serif;color:#ffc93c';
      const b = document.createElement('div'); if (o.body instanceof Node) b.appendChild(o.body); else b.textContent = o.body || '';
      const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap';
      for (const btn of (o.buttons || [{ label: 'OK', value: true }])) { const x = document.createElement('button'); x.textContent = btn.label; x.style.cssText = 'min-height:44px;padding:0 16px;border:3px solid #0b0d22;border-radius:10px;font:400 14px Bungee,Impact,sans-serif;cursor:pointer;box-shadow:0 4px 0 #0b0d22;background:' + (btn.variant === 'danger' ? '#ff5d5d' : btn.variant === 'secondary' ? '#2a2f6b' : '#ffc93c') + ';color:' + (btn.variant === 'secondary' ? '#f3f6fb' : '#14163a'); x.addEventListener('click', () => { back.remove(); resolve(btn.value); }); row.appendChild(x); }
      card.append(h, b, row); back.appendChild(card); this.ui.appendChild(back); const f = row.querySelector('button'); if (f) f.focus();
      back.addEventListener('keydown', (e) => { if (e.key === 'Escape') { back.remove(); resolve(null); } });
    });
  }
}
