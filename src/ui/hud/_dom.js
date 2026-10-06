// _dom.js: tiny DOM helpers shared by the battle-side UI (HUD modules + battle screens). Helper file (underscore = not a registry module).
// Rules baked in: dynamic strings go through textContent / text nodes only, writes happen only on change, tweens are transform/opacity (WAAPI),
// nothing here reads layout.
import { TEAM_PALETTES } from '../../render/style.js';

export const SVGNS = 'http://www.w3.org/2000/svg';

const ATTR_SKIP = new Set(['class', 'cls', 'text', 'style', 'on', 'attrs', 'dataset', 'value', 'checked', 'disabled', 'hidden', 'tabIndex']);

/** h('div', {class:'x', on:{click:fn}, aria-label:'..'}, child, 'text', [more]) -> HTMLElement. Strings become text nodes (never markup). */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    if (props.class || props.cls) el.className = props.class || props.cls;
    if (props.text != null) el.textContent = String(props.text);
    if (props.style) for (const k in props.style) { if (k.startsWith('--')) el.style.setProperty(k, props.style[k]); else el.style[k] = props.style[k]; }
    if (props.on) for (const k in props.on) el.addEventListener(k, props.on[k]);
    if (props.attrs) for (const k in props.attrs) el.setAttribute(k, props.attrs[k]);
    if (props.dataset) for (const k in props.dataset) el.dataset[k] = props.dataset[k];
    if (props.value != null) el.value = props.value;
    if (props.checked != null) el.checked = !!props.checked;
    if (props.disabled != null) el.disabled = !!props.disabled;
    if (props.hidden != null) el.hidden = !!props.hidden;
    if (props.tabIndex != null) el.tabIndex = props.tabIndex;
    for (const k in props) {
      if (ATTR_SKIP.has(k)) continue;
      const v = props[k];
      if (v === false || v == null) continue;
      el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, kids);
  return el;
}

export function append(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) append(el, k);
    else if (typeof k === 'string' || typeof k === 'number') el.appendChild(document.createTextNode(String(k)));
    else el.appendChild(k);
  }
  return el;
}

export function svg(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) { const v = attrs[k]; if (v != null && v !== false) el.setAttribute(k, String(v)); }
  for (const k of kids.flat()) if (k) el.appendChild(k);
  return el;
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const fmtInt = (n) => { n = Math.round(+n || 0); const neg = n < 0; let s = String(Math.abs(n)); let o = ''; while (s.length > 3) { o = ',' + s.slice(-3) + o; s = s.slice(0, -3); } return (neg ? '-' : '') + s + o; };
export const fmtTime = (s) => { s = Math.max(0, Math.floor(+s || 0)); const m = Math.floor(s / 60); const r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; };
export function hash32(str) { let hh = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { hh ^= str.charCodeAt(i); hh = Math.imul(hh, 16777619) >>> 0; } return hh >>> 0; }
/** Small deterministic RNG for cosmetic UI choices that must not consume the sim stream. */
export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const pick = (arr, seed) => arr[(seed >>> 0) % arr.length];

/** Write textContent only when it changed. Cache lives on the element. */
export function setText(el, s) { s = String(s); if (el._tx !== s) { el._tx = s; el.textContent = s; } }
export function setAttr(el, k, v) { v = String(v); const key = '_a_' + k; if (el[key] !== v) { el[key] = v; el.setAttribute(k, v); } }
export function setVar(el, k, v) { v = String(v); const key = '_v_' + k; if (el[key] !== v) { el[key] = v; el.style.setProperty(k, v); } }
export function setCls(el, name, on) { on = !!on; const key = '_c_' + name; if (el[key] !== on) { el[key] = on; el.classList.toggle(name, on); } }
export function setHidden(el, hidden) { hidden = !!hidden; if (el._hd !== hidden) { el._hd = hidden; el.hidden = hidden; } }
export function setScaleX(el, f) { f = Math.round(clamp(f, 0, 1) * 1000) / 1000; if (el._sx !== f) { el._sx = f; el.style.transform = 'scaleX(' + f + ')'; } }
export function setScaleY(el, f) { f = Math.round(clamp(f, 0, 1) * 1000) / 1000; if (el._sy !== f) { el._sy = f; el.style.transform = 'scaleY(' + f + ')'; } }

/** Safe audio call (cue ids come from spec/audio.md; missing cues or a missing audio engine must never throw). */
export function sfx(ctx, cue, opts) { try { if (ctx && ctx.audio && ctx.audio.play) ctx.audio.play(cue, opts); } catch (e) { /* audio is optional */ } }

export function reduced(ctx) {
  try { if (ctx && ctx.settings && ctx.settings.get('reduceMotion')) return true; } catch (e) { /* settings optional */ }
  try { if (document.documentElement.classList.contains('vw-reduce-motion')) return true; } catch (e) { /* no document */ }
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

/** WAAPI wrapper: transform/opacity keyframes only; skipped under Reduce Motion (optionally runs `calm` keyframes instead). Never forces layout. */
export function anim(ctx, el, frames, opts, calm) {
  try {
    if (!el.animate) return null;
    if (reduced(ctx)) { if (!calm) return null; return el.animate(calm, Object.assign({ duration: 160, easing: 'linear' }, opts && opts.calmOpts)); }
    return el.animate(frames, opts);
  } catch (e) { return null; }
}

export function hexCss(n) { return '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6); }

/** Apply theme classes + team colour vars to a root, keep them in sync with settings. Returns an off() function. */
export function applyTheme(ctx, root) {
  const apply = () => {
    let pal = 'classic', rm = false, hc = false;
    try { pal = ctx.settings.get('palette') || 'classic'; rm = !!ctx.settings.get('reduceMotion'); hc = !!ctx.settings.get('highContrastUI'); } catch (e) { /* defaults */ }
    const p = TEAM_PALETTES[pal] || TEAM_PALETTES.classic;
    root.style.setProperty('--team-a', hexCss(p[0]));
    root.style.setProperty('--team-b', hexCss(p[1]));
    root.dataset.palette = pal;
    root.classList.toggle('rm', rm || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
    root.classList.toggle('hc', hc || pal === 'contrast');
    root.classList.toggle('pal-cvd', pal !== 'classic');
  };
  apply();
  let off = null;
  try { if (ctx.settings && ctx.settings.on) off = ctx.settings.on(apply); } catch (e) { /* optional */ }
  return () => { if (typeof off === 'function') off(); };
}

/** Collects listeners/timers so destroy() is one call. */
export function disposer() {
  const fns = [];
  return {
    on(target, type, fn, opts) { target.addEventListener(type, fn, opts); fns.push(() => target.removeEventListener(type, fn, opts)); },
    add(fn) { if (fn) fns.push(fn); },
    timeout(fn, ms) { const id = setTimeout(fn, ms); fns.push(() => clearTimeout(id)); return id; },
    interval(fn, ms) { const id = setInterval(fn, ms); fns.push(() => clearInterval(id)); return id; },
    run() { while (fns.length) { try { fns.pop()(); } catch (e) { /* keep tearing down */ } } },
  };
}

/** wide | tablet | phone from the viewport (ctx.platform.viewport() when present). */
export function layoutOf(ctx) {
  let w = window.innerWidth, hh = window.innerHeight;
  try { const v = ctx && ctx.platform && ctx.platform.viewport && ctx.platform.viewport(); if (v && v.w) { w = v.w; hh = v.h; } } catch (e) { /* use window */ }
  if (Math.min(w, hh) < 520 || w < 640) return 'phone';
  if (w < 1100) return 'tablet';
  return 'wide';
}

/** Plain-language list join: ['a','b','c'] -> 'a, b and c'. */
export function andList(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

/** Unit display helpers (content is optional in tools). */
/** UnitDef lookup that works with the contract (`content.units`) and COORD's current content object (`content.defs`). */
export function unitDef(ctx, defId) { const c = ctx && ctx.content; return (c && ((c.units && c.units[defId]) || (c.defs && c.defs[defId]))) || null; }
export function unitName(ctx, defId) { const u = unitDef(ctx, defId); return (u && u.name) || String(defId || '?').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
export function unitRole(ctx, defId) { const u = unitDef(ctx, defId); return (u && u.role) || ''; }
/** hud.cam is either a mode string (COORD today) or {mode, x, z}. */
export const camMode = (hud) => { const c = hud && hud.cam; return (typeof c === 'string' ? c : c && c.mode) || 'orbit'; };
export const ROLE_ICON = { melee: 'sword', ranged: 'bow', cavalry: 'horse', siege: 'siege', support: 'heart', hero: 'crown', monster: 'skull', swarm: 'swarm', beast: 'paw' };

/** Key-capture friendly: is the event aimed at a text field? (hotkeys must not fire while typing). */
export function isTyping(e) { const t = e && e.target; return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)); }
