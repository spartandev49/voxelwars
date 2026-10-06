/* =====================================================================================================
   VOXELWARS UI kit (kit.js)  -  pure DOM builders for the "Toy-box Olympus" components.   Owner: UI-A.  API is STABLE: UI-B builds on it.
   Every dynamic string goes through textContent / text nodes. Nothing here uses innerHTML.

   SETUP
     import * as K from '../kit.js';          // from src/ui/screens/*.js
     K.init(ctx)                              // once per ctx (idempotent): wires sound + applies/subscribes UI settings
                                              // (Reduce Motion class, UI scale, high-contrast, colour palette). COORD: call at boot.
   CORE HELPERS
     K.h(tag, props?, ...children) -> HTMLElement      props: class|className, id, text, style(obj|--var), dataset, on:{evt:fn}, aria-*, role, ...attrs
     K.icon(name, {class,size}) -> SVG                 names: see icons.js ICON_NAMES
     K.sfx(cue, opts?)                                  ctx.audio.play wrapper (silent when no audio)
     K.reduced() -> bool                                OS reduce-motion OR :root.vw-reduce-motion
     K.anim(el, frames, opts) -> Promise                WAAPI helper; no-op under Reduce Motion
     K.enter(el|els, 'pop'|'left'|'right'|'fade', i?)   entrance animation classes (transform/opacity only)
     K.leave(el) -> Promise  /  K.withExit(root, api) -> api   optional screen exit tween: api.exit() (the shell may await it before removing the root)
     K.keyLabel(code) -> 'W' | 'Space' | '[' ...        pretty names for KeyboardEvent.code
     K.fmtNum(n) K.fmtTime(sec) K.fmtClock(hours) K.clamp(v,a,b)

   COMPONENTS (each returns an element; extra methods noted; `el.destroy?.()` for any that need cleanup)
     K.button(label, {variant:'primary|secondary|ghost|danger|olive|lapis', size:'sm|md|lg|xl', icon, onClick(ev), sound:'ui_click'|false,
                      id, aria, block, align:'start', sub, hint:'key', disabled, pressed, class}) -> <button>   .setLabel(t) .setDisabled(b) .setPressed(b)
     K.iconButton(iconName, ariaLabel, opts)            icon-only 44x44 button (aria-label required)
     K.tablet(title, content, {id, sub, icon, actions:[Node], variant:'glass|flat|gold', tight, tilt:'l|r', headless}) -> <section>  .body .setTitle(t)
     K.tabs(items:[{id,label,icon?,badge?,dot?,disabled?}], {value, onChange(id), label, id, vertical, scroll}) -> tablist  .select(id,{silent}) .value  .setBadge(id,n)
     K.tabPanel(tabsId, itemId) -> <div role=tabpanel>
     K.chip(label, {variant, icon, onClick, pressed, title, id, aria}) -> span | button(pressed/onClick)
     K.slider({min,max,step,value,onInput(v),onChange(v),label,format(v),ticks:n|'step'|[{v,label?}],id,valueWidth,hideValue}) -> div  .get() .set(v,silent) .input
     K.toggle({value,onChange(v),label,id,disabled}) -> <button role=switch>   .get() .set(v,silent)
     K.select({options:[{value,label,disabled?,group?}],value,onChange(v),label,id,disabled}) -> div.vw-select   .get() .set(v,silent) .select
     K.segmented({options:[{value,label,sub?,icon?,disabled?,title?}],value,onChange(v),label,id,fill}) -> radiogroup  .get() .set(v,silent) .setDisabled(value,b)
     K.card(unitDef, {onClick, selected, count, locked, disabled, reason, blurb, counters:true|'beats'|false, compact, factions}) -> <button class=vw-card>   .setSelected(b) .setCount(n) .setDisabled(b, reasonText)
     K.tooltip(el, textOrFn, {kind:'bad'}) -> off()     hover (350ms) + keyboard focus + touch long-press; sets aria-describedby while shown
     K.showTip({x,y,text,kind}) / K.hideTip()           free-floating tip (cursor-following invalid-placement reasons)
     K.toast(text, {kind:'info|success|warn|error|achievement', ms, icon, sound}) -> el  .dismiss()      K.toastInset(rem) -> restore()  (lift toasts above a bottom bar)
     K.modal({title, body:Node|string|(api)=>Node, buttons:[{label,variant,value,cancel?,primary?,keep?,onClick?(api)}]  (api = {close(v), el, body, foot}), dismissible=true, wide, dismissValue=null, id, icon}) -> Promise<value>
        (replaces confirm(); Esc closes (resolves dismissValue); focus trap; background inert; focus restored) ;  K.hasModal() ; K.closeModals(value)
     K.ask({title,text,yes,no,danger}) -> Promise<boolean>        K.textModal({title,text,note,readOnly,copy,ok,placeholder,onSubmit(text)->errString|null}) -> Promise<string|null>
     K.banner(text, {kind:'gold|lapis|crimson|olive', ms=1900, host}) -> el  .hide()            round-start ribbon
     K.progress({value,max,label,tone:'gold|olive|lapis|crimson|lava|sky|team-a|team-b',thin,tall,aria}) -> div  .set(v,labelText?,over?) .setMax(m)
     K.meter({a,b,labelA,labelB}) -> div  .set(a,b)                                         army meter (team A vs B)
     K.kbd(key|code) -> <kbd>          K.toolbar(children, {label,id}) -> role=toolbar (arrow-key roving)     K.emptyState({icon,title,text,action})
   LAYOUT HELPERS
     K.field(label, control, {hint, stack, info}) -> settings row        K.statBar(label, value, max, {tone,text}) -> .vw-stat row
     K.searchBox({onInput,label,id,value,placeholder}) -> div  .input     K.divider()  K.note(text, 'warn|bad|ok')
     K.backdrop({night}) -> .vw-bg (sky, sun, clouds)                      K.pageFrame({title, sub, onBack, backLabel, actions, night, bg, id}) -> {el, bar, scroll, content, bg, mount(parent), destroy()}
     K.muteButton() -> icon button reflecting settings.muted (every screen shows mute state, AU9)
     K.copyText(text, {title}) -> Promise<bool>  (clipboard -> fallback modal with selectable text)
     K.roving(container, {selector, orientation}) -> off()    arrow-key focus movement for menus/toolbars
     K.focusables(root) -> HTMLElement[]    K.focusFirst(root)
   SETTINGS HOOKS
     K.applyUiSettings(settings) / K.installUiSettings(ctx) -> unsubscribe     (html font-size = 16px x settings.uiScale x window fit; fit is 1 up to 1280x720 and grows to 1.3 at 1920x1080)
   ===================================================================================================== */
import { icon as makeIcon, ICON_NAMES } from './icons.js';
import { ROLE_ICON, ROLE_LABEL, ROLE_CHIP, factionColor, counterHints, bindContent } from './unitinfo.js';
import { T as KT } from './strings.js';

export const icon = makeIcon;
export { ICON_NAMES };

let CTX = null;
const root = () => document.documentElement;
const appRoot = () => document.getElementById('vw-root') || document.body;

/* ---------------------------------------------------------------- core */
let fitRaf = 0;
/** The first Tab on a menu page must land on its first control, not on <body> (the browser starts from the document when nothing was clicked yet).
 *  Skipped in battle (a .vw-hud is mounted: Tab hides the HUD there) and while the page has focus somewhere real. Shift+Tab goes to the last control. */
function firstTab(e) {
  if (e.key !== 'Tab' || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;
  const ae = document.activeElement;
  if (ae && ae !== document.body && ae !== document.documentElement) return;
  if (document.querySelector('.vw-hud')) return;
  const modals = document.querySelectorAll('.vw-modal');
  let scope = modals.length ? modals[modals.length - 1] : null;
  if (!scope) { const ss = document.querySelectorAll('.vw-screen'); scope = ss.length ? ss[ss.length - 1] : null; }
  if (!scope) return;
  const list = focusables(scope);
  if (!list.length) return;
  e.preventDefault();
  const t = e.shiftKey ? list[list.length - 1] : list[0];
  try { t.focus({ preventScroll: true }); } catch (err) { t.focus(); }
}
export function init(ctx) {
  if (ctx && ctx !== CTX) {
    CTX = ctx;
    try { bindContent(ctx.content); } catch (e) { /* content is optional in tests */ }
    try { installUiSettings(ctx); } catch (e) { /* settings may be partial in tests */ }
    if (!init.bound) {
      init.bound = true;
      window.addEventListener('keydown', firstTab, true);
      window.addEventListener('resize', () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(() => { if (CTX) applyUiSettings(CTX.settings); }); });
    }
  }
  return CTX;
}
export function ctxOf() { return CTX; }

export function sfx(cue, opts) {
  if (!cue || !CTX || !CTX.audio || typeof CTX.audio.play !== 'function') return;
  try { CTX.audio.play(cue, opts); } catch (e) { /* audio must never break UI */ }
}
let lastHover = 0;
function hoverSfx(ev) {
  if (ev && ev.pointerType && ev.pointerType !== 'mouse') return;
  const t = performance.now();
  if (t - lastHover < 60) return;
  lastHover = t;
  sfx('ui_hover');
}

export function reduced() {
  if (root().classList.contains('vw-reduce-motion')) return true;
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmtNum = (n) => (typeof n === 'number' && isFinite(n) ? Math.round(n).toLocaleString('en-US') : String(n == null ? '' : n));
export function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
export function fmtClock(hours) {
  const hh = Math.floor(hours) % 24, mm = Math.round((hours - Math.floor(hours)) * 60) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
const KEY_NAMES = { Space: 'Space', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', BracketLeft: '[', BracketRight: ']', Escape: 'Esc', Enter: 'Enter', Tab: 'Tab', Delete: 'Del', Backspace: 'Backspace', Backquote: '`', Minus: '-', Equal: '=', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", Backslash: '\\', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt', PageUp: 'PgUp', PageDown: 'PgDn' };
export function keyLabel(code) {
  if (!code) return '';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  let m = /^Key([A-Z])$/.exec(code); if (m) return m[1];
  m = /^Digit(\d)$/.exec(code); if (m) return m[1];
  m = /^Numpad(\w+)$/.exec(code); if (m) return 'Num ' + m[1];
  return code;
}

function appendKids(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) appendKids(el, k);
    else if (k instanceof Node) el.appendChild(k);
    else el.appendChild(document.createTextNode(String(k)));
  }
}
/** Tiny hyperscript. NEVER pass untrusted strings as `style` strings; text/children are always text nodes. */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const k of Object.keys(props)) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class' || k === 'className') el.className = Array.isArray(v) ? v.filter(Boolean).join(' ') : String(v);
      else if (k === 'text') el.textContent = String(v);
      else if (k === 'style') { if (typeof v === 'string') el.style.cssText = v; else for (const s of Object.keys(v)) { if (s.startsWith('--')) el.style.setProperty(s, String(v[s])); else el.style[s] = v[s]; } }
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'on') for (const ev of Object.keys(v)) el.addEventListener(ev, v[ev]);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  appendKids(el, kids);
  return el;
}

/** WAAPI helper. Resolves immediately (no animation) under Reduce Motion. transform/opacity only. */
export function anim(el, frames, opts) {
  if (!el || !el.animate || reduced()) return Promise.resolve();
  try {
    const a = el.animate(frames, Object.assign({ duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }, opts || {}));
    return a.finished.catch(() => {});
  } catch (e) { return Promise.resolve(); }
}
/** Exit tween for a screen root (fade + slight sink; transform/opacity only). Resolves when done, immediately under Reduce Motion. */
export function leave(el) {
  return anim(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px) scale(.985)' }], { duration: 180, fill: 'forwards', easing: 'cubic-bezier(.4,0,1,1)' });
}
/** Adds the optional `exit(): Promise` hook to a screen api: `return K.withExit(root, { destroy, onBack })`. The shell may await it before removing the root. */
export function withExit(root, api) { api.exit = () => leave(root); return api; }
/** Entrance by CSS class (stagger with `i`). */
export function enter(els, kind, i) {
  const list = Array.isArray(els) ? els : [els];
  list.forEach((el, n) => {
    if (!el) return;
    el.classList.add('vw-in-' + (kind || 'pop'));
    el.style.setProperty('--i', String(i == null ? n : i + n));
  });
}

/* ---------------------------------------------------------------- settings -> root classes */
export function applyUiSettings(settings) {
  if (!settings) return;
  const g = (k, d) => { try { const v = settings.get(k); return v === undefined || v === null ? d : v; } catch (e) { return d; } };
  const r = root();
  r.classList.toggle('vw-reduce-motion', !!g('reduceMotion', false));
  r.classList.toggle('vw-high-contrast', !!g('highContrastUI', false));
  const pal = g('palette', 'classic');
  r.classList.toggle('vw-pal-cvd', pal === 'cvd');
  r.classList.toggle('vw-pal-contrast', pal === 'contrast');
  const sc = clamp(+g('uiScale', 1) || 1, 0.8, 1.3);
  r.style.fontSize = (16 * sc * viewportFit()) + 'px';
}
/** Big windows get proportionally bigger UI (1920x1080 -> 1.3x); anything at or below 1280x720 (and every phone) is 1x. "UI size 100%" means "fit to this window". */
function viewportFit() {
  const w = window.innerWidth, hh = window.innerHeight;
  if (w < 1500) return 1;
  return clamp(Math.min(w / 1280, hh / 720), 1, 1.3);
}
export function installUiSettings(ctx) {
  applyUiSettings(ctx.settings);
  let off = null;
  if (ctx.settings && typeof ctx.settings.on === 'function') off = ctx.settings.on(() => applyUiSettings(ctx.settings));
  return typeof off === 'function' ? off : () => {};
}

/* ---------------------------------------------------------------- focus helpers */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export function focusables(rootEl) {
  return Array.from(rootEl.querySelectorAll(FOCUSABLE)).filter((el) => !el.closest('[hidden],[inert],.vw-hide') && el.getClientRects().length > 0);
}
export function focusFirst(rootEl) {
  const f = focusables(rootEl)[0];
  if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
  return f || null;
}
/** Arrow-key roving focus between focusable children. orientation: 'vertical' | 'horizontal' | 'both'. */
export function roving(container, o) {
  o = o || {};
  const sel = o.selector || 'button:not([disabled]),[role=menuitem]:not([disabled])';
  const orient = o.orientation || 'both';
  const onKey = (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    const v = (k === 'ArrowDown' || k === 'ArrowUp') && orient !== 'horizontal';
    const hz = (k === 'ArrowRight' || k === 'ArrowLeft') && orient !== 'vertical';
    if (!v && !hz && k !== 'Home' && k !== 'End') return;
    const items = Array.from(container.querySelectorAll(sel)).filter((x) => x.getClientRects().length > 0);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement && document.activeElement.closest ? document.activeElement.closest(sel) : null);
    let n = i;
    if (k === 'Home') n = 0; else if (k === 'End') n = items.length - 1;
    else if (k === 'ArrowDown' || k === 'ArrowRight') n = i < 0 ? 0 : (i + 1) % items.length;
    else n = i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length;
    e.preventDefault();
    items[n].focus();
  };
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}

/* ---------------------------------------------------------------- buttons */
export function button(label, o) {
  o = o || {};
  const v = o.variant || 'secondary';
  const iconOnly = !!o.icon && (label == null || label === '');
  const el = h('button', {
    type: 'button', id: o.id,
    class: ['vw-btn', 'vw-btn--' + v, o.size && o.size !== 'md' && 'vw-btn--' + o.size, o.block && 'vw-btn--block', o.align === 'start' && 'vw-btn--start', iconOnly && 'vw-btn--icon', o.class],
    'aria-label': o.aria || (iconOnly ? o.title : null) || null,
    disabled: o.disabled ? true : null, 'aria-pressed': o.pressed == null ? null : String(!!o.pressed),
  });
  const face = h('span', { class: 'vw-btn__face' });
  if (o.icon) face.appendChild(makeIcon(o.icon, { class: 'vw-btn__icon' }));
  let labelEl = null;
  if (!iconOnly) {
    labelEl = h('span', { class: 'vw-btn__label' }, label);
    if (o.sub) {
      face.appendChild(h('span', { class: 'vw-btn__stack' }, labelEl, h('span', { class: 'vw-btn__sub' }, o.sub)));
    } else face.appendChild(labelEl);
  }
  if (o.hint) face.appendChild(h('span', { class: 'vw-btn__hint' }, kbd(o.hint)));
  if (o.iconAfter) face.appendChild(makeIcon(o.iconAfter, { class: 'vw-btn__icon' }));
  el.appendChild(face);
  const sound = o.sound === undefined ? (v === 'primary' ? 'ui_confirm' : 'ui_click') : o.sound;
  el.addEventListener('pointerenter', (e) => { if (!el.disabled) hoverSfx(e); });
  el.addEventListener('click', (e) => {
    if (el.disabled) { e.preventDefault(); return; }       // native disabled = inert; aria-disabled stays clickable so the screen can explain why
    if (sound) sfx(sound);
    if (o.onClick) o.onClick(e);
  });
  el.setLabel = (t) => { if (labelEl) labelEl.textContent = t; };
  el.setDisabled = (b) => { el.disabled = !!b; };
  el.setPressed = (b) => { el.setAttribute('aria-pressed', String(!!b)); };
  return el;
}
export function iconButton(iconName, aria, o) {
  return button('', Object.assign({ icon: iconName, aria }, o || {}, { variant: (o && o.variant) || 'secondary' }));
}

/* ---------------------------------------------------------------- tablet */
let tabletSeq = 0;
export function tablet(title, content, o) {
  o = o || {};
  const el = h('section', { class: ['vw-tablet', o.variant && 'vw-tablet--' + o.variant, o.tight && 'vw-tablet--tight', o.tilt && 'vw-tilt-' + o.tilt, o.class], id: o.id });
  let titleEl = null;
  if (title && !o.headless) {
    const tid = (o.id || 'vw-tablet-' + (++tabletSeq)) + '-t';
    titleEl = h('h2', { class: 'vw-tablet__title', id: tid }, o.icon ? makeIcon(o.icon) : null, h('span', { text: title }));
    const head = h('div', { class: 'vw-tablet__head' }, titleEl);
    if (o.sub) head.appendChild(h('span', { class: 'vw-tablet__sub' }, o.sub));
    if (o.actions && o.actions.length) head.appendChild(h('div', { class: 'vw-tablet__actions' }, o.actions));
    el.appendChild(head);
    el.setAttribute('aria-labelledby', tid);
  }
  const body = h('div', { class: 'vw-tablet__body' });
  appendKids(body, [content]);
  el.appendChild(body);
  el.body = body;
  el.setTitle = (t) => { if (titleEl) titleEl.lastChild.textContent = t; };
  return el;
}

/* ---------------------------------------------------------------- tabs */
let tabSeq = 0;
export function tabs(items, o) {
  o = o || {};
  const id = o.id || 'vw-tabs-' + (++tabSeq);
  const el = h('div', { class: ['vw-tabs', o.vertical && 'vw-tabs--vertical', o.scroll && 'vw-tabs--scroll', o.class], role: 'tablist', id, 'aria-label': o.label || null, 'aria-orientation': o.vertical ? 'vertical' : null });
  const btns = new Map();
  let cur = null;
  const mk = (it) => {
    const b = h('button', { type: 'button', class: 'vw-tab', role: 'tab', id: id + '-' + it.id, 'aria-selected': 'false', tabindex: '-1', 'aria-controls': it.panelId || null, disabled: it.disabled ? true : null });
    if (it.dot) b.appendChild(h('span', { class: 'vw-tab__dot', style: { '--c': it.dot } }));
    if (it.icon) b.appendChild(makeIcon(it.icon));
    b.appendChild(h('span', { class: 'vw-tab__label', text: it.label }));
    if (it.badge != null) b.appendChild(h('span', { class: 'vw-tab__badge', text: String(it.badge) }));
    b.addEventListener('pointerenter', (e) => { if (!b.disabled) hoverSfx(e); });
    b.addEventListener('click', () => { if (cur !== it.id) { sfx('ui_click'); select(it.id); } });
    btns.set(it.id, b);
    el.appendChild(b);
  };
  items.forEach(mk);
  function select(vid, opt) {
    if (!btns.has(vid)) return;
    cur = vid;
    btns.forEach((b, k) => { const on = k === vid; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    if (!(opt && opt.silent) && o.onChange) o.onChange(vid);
  }
  el.addEventListener('keydown', (e) => {
    const keys = o.vertical ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
    if (!keys.includes(e.key) && e.key !== 'Home' && e.key !== 'End') return;
    const ids = Array.from(btns.keys()).filter((k) => !btns.get(k).disabled);
    let i = ids.indexOf(cur);
    if (e.key === 'Home') i = 0; else if (e.key === 'End') i = ids.length - 1;
    else if (e.key === keys[1]) i = (i + 1) % ids.length; else i = (i - 1 + ids.length) % ids.length;
    e.preventDefault();
    sfx('ui_tick');
    select(ids[i]);
    btns.get(ids[i]).focus();
  });
  Object.defineProperty(el, 'value', { get: () => cur });
  el.select = select;
  el.button = (k) => btns.get(k);
  el.setBadge = (k, n) => { const b = btns.get(k); if (!b) return; let bd = b.querySelector('.vw-tab__badge'); if (n == null) { if (bd) bd.remove(); return; } if (!bd) { bd = h('span', { class: 'vw-tab__badge' }); b.appendChild(bd); } bd.textContent = String(n); };
  select(o.value != null ? o.value : (items[0] && items[0].id), { silent: true });
  return el;
}
export function tabPanel(tabsId, itemId) {
  return h('div', { role: 'tabpanel', id: tabsId + '-panel-' + itemId, 'aria-labelledby': tabsId + '-' + itemId });
}

/* ---------------------------------------------------------------- chip */
export function chip(label, o) {
  o = o || {};
  const interactive = !!o.onClick || o.pressed !== undefined;
  const el = h(interactive ? 'button' : 'span', {
    class: ['vw-chip', o.variant && 'vw-chip--' + o.variant, interactive && 'vw-chip--btn', o.class], id: o.id, title: null,
    type: interactive ? 'button' : null, 'aria-pressed': interactive && o.pressed !== undefined ? String(!!o.pressed) : null, 'aria-label': o.aria || null,
  });
  if (o.icon) el.appendChild(makeIcon(o.icon, { class: 'vw-chip__icon' }));
  el.appendChild(h('span', { text: label }));
  if (interactive) {
    el.addEventListener('pointerenter', hoverSfx);
    el.addEventListener('click', (e) => { sfx('ui_click'); if (o.onClick) o.onClick(e); });
  }
  if (o.title) tooltip(el, o.title);
  el.setPressed = (b) => el.setAttribute('aria-pressed', String(!!b));
  return el;
}

/* ---------------------------------------------------------------- slider */
let sliderSeq = 0;
export function slider(o) {
  const min = o.min != null ? o.min : 0, max = o.max != null ? o.max : 1, step = o.step != null ? o.step : 1;
  const fmt = o.format || ((v) => String(v));
  const input = h('input', { type: 'range', class: 'vw-slider__input', min, max, step, value: o.value != null ? o.value : min, id: o.id || 'vw-slider-' + (++sliderSeq), 'aria-label': o.label || null });
  const out = h('output', { class: 'vw-slider__val', for: input.id, 'aria-hidden': 'true' });
  const row = h('div', { class: 'vw-slider__row' }, input, o.hideValue ? null : out);
  const el = h('div', { class: ['vw-slider', o.hideValue && 'vw-slider--noval', o.class], style: o.valueWidth ? { '--valw': o.valueWidth } : null }, row);
  if (o.ticks) {
    let marks = [];
    if (Array.isArray(o.ticks)) marks = o.ticks;
    else if (o.ticks === 'step') { const n = Math.min(41, Math.round((max - min) / step) + 1); for (let i = 0; i < n; i++) marks.push({ v: min + (i * (max - min)) / (n - 1) }); }
    else { const n = Math.max(2, o.ticks | 0); for (let i = 0; i < n; i++) marks.push({ v: min + (i * (max - min)) / (n - 1) }); }
    const tk = h('div', { class: 'vw-slider__ticks' });
    for (const m of marks) {
      const t = h('span', { class: ['vw-slider__tick', m.label ? 'is-major' : null], style: { position: 'absolute', left: ((m.v - min) / (max - min) * 100) + '%', transform: 'translateX(-50%)' } });
      if (m.label) t.appendChild(h('span', { text: m.label }));
      tk.appendChild(t);
    }
    el.appendChild(h('div', { class: 'vw-slider__tickrow' }, tk, o.hideValue ? null : h('span', { class: 'vw-slider__tickgap', 'aria-hidden': 'true' })));
  }
  let last = 0;
  const paint = () => {
    const v = +input.value;
    el.style.setProperty('--pct', ((v - min) / (max - min || 1) * 100) + '%');
    out.textContent = fmt(v);
    input.setAttribute('aria-valuetext', fmt(v));
  };
  input.addEventListener('input', () => {
    paint();
    const t = performance.now();
    if (t - last > 40) { last = t; sfx('ui_tick'); }
    if (o.onInput) o.onInput(+input.value);
  });
  input.addEventListener('change', () => { if (o.onChange) o.onChange(+input.value); });
  input.addEventListener('pointerenter', hoverSfx);
  el.get = () => +input.value;
  el.set = (v, silent) => { input.value = String(v); paint(); if (!silent && o.onInput) o.onInput(+input.value); };
  el.input = input;
  paint();
  return el;
}

/* ---------------------------------------------------------------- toggle */
let toggleSeq = 0;
export function toggle(o) {
  o = o || {};
  const el = h('button', { type: 'button', class: ['vw-toggle', o.class], role: 'switch', id: o.id || 'vw-toggle-' + (++toggleSeq), 'aria-checked': String(!!o.value), 'aria-label': o.label || null, disabled: o.disabled ? true : null },
    h('span', { class: 'vw-toggle__track' }, h('span', { class: 'vw-toggle__txt', 'aria-hidden': 'true' })), h('span', { class: 'vw-toggle__knob' }));
  const txt = el.querySelector('.vw-toggle__txt');
  const paint = () => { txt.textContent = el.getAttribute('aria-checked') === 'true' ? 'ON' : 'OFF'; };
  paint();
  el.addEventListener('pointerenter', (e) => { if (!el.disabled) hoverSfx(e); });
  el.addEventListener('click', () => {
    if (el.disabled) return;
    const nv = el.getAttribute('aria-checked') !== 'true';
    el.setAttribute('aria-checked', String(nv)); paint();
    sfx('ui_toggle');
    if (o.onChange) o.onChange(nv);
  });
  el.get = () => el.getAttribute('aria-checked') === 'true';
  el.set = (v, silent) => { el.setAttribute('aria-checked', String(!!v)); paint(); if (!silent && o.onChange) o.onChange(!!v); };
  return el;
}

/* ---------------------------------------------------------------- select */
let selectSeq = 0;
export function select(o) {
  const sel = h('select', { id: o.id || 'vw-select-' + (++selectSeq), 'aria-label': o.label || null, disabled: o.disabled ? true : null });
  const groups = new Map();
  for (const opt of o.options || []) {
    const oe = h('option', { value: opt.value, disabled: opt.disabled ? true : null }, opt.label);
    if (opt.group) { let g = groups.get(opt.group); if (!g) { g = h('optgroup', { label: opt.group }); groups.set(opt.group, g); sel.appendChild(g); } g.appendChild(oe); }
    else sel.appendChild(oe);
  }
  if (o.value != null) sel.value = String(o.value);
  const el = h('div', { class: ['vw-select', o.class] }, sel);
  sel.addEventListener('change', () => { sfx('ui_click'); if (o.onChange) o.onChange(sel.value); });
  sel.addEventListener('pointerenter', hoverSfx);
  el.get = () => sel.value;
  el.set = (v, silent) => { sel.value = String(v); if (!silent && o.onChange) o.onChange(sel.value); };
  el.select = sel;
  return el;
}

/* ---------------------------------------------------------------- segmented */
let segSeq = 0;
export function segmented(o) {
  const id = o.id || 'vw-seg-' + (++segSeq);
  const el = h('div', { class: ['vw-seg', o.fill && 'vw-seg--fill', o.class], role: 'radiogroup', id, 'aria-label': o.label || null });
  const btns = [];
  let cur = o.value;
  for (const opt of o.options) {
    const b = h('button', { type: 'button', class: 'vw-seg__opt', role: 'radio', 'aria-checked': 'false', tabindex: '-1', disabled: opt.disabled ? true : null, dataset: { value: String(opt.value) } });
    if (opt.icon) b.appendChild(makeIcon(opt.icon));
    b.appendChild(opt.sub ? h('span', {}, h('span', { text: opt.label }), h('span', { class: 'vw-seg__sub', text: opt.sub })) : h('span', { text: opt.label }));
    b.addEventListener('pointerenter', (e) => { if (!b.disabled) hoverSfx(e); });
    b.addEventListener('click', () => { if (cur !== opt.value) { sfx('ui_click'); set(opt.value); } });
    if (opt.title) tooltip(b, opt.title);
    btns.push({ b, v: opt.value });
    el.appendChild(b);
  }
  function paint() {
    let any = false;
    btns.forEach(({ b, v }) => { const on = v === cur; if (on) any = true; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    if (!any) { const first = btns.find((x) => !x.b.disabled) || btns[0]; if (first) first.b.tabIndex = 0; }          // every segment may be disabled (a saved arena fixes the size)
  }
  function set(v, silent) { cur = v; paint(); if (!silent && o.onChange) o.onChange(v); }
  el.addEventListener('keydown', (e) => {
    const k = e.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(k)) return;
    const live = btns.filter((x) => !x.b.disabled);
    let i = live.findIndex((x) => x.v === cur); if (i < 0) i = 0;
    if (k === 'Home') i = 0; else if (k === 'End') i = live.length - 1;
    else if (k === 'ArrowRight' || k === 'ArrowDown') i = (i + 1) % live.length; else i = (i - 1 + live.length) % live.length;
    e.preventDefault(); sfx('ui_tick');
    set(live[i].v); live[i].b.focus();
  });
  paint();
  el.get = () => cur;
  el.set = set;
  el.setDisabled = (v, d) => { const x = btns.find((q) => q.v === v); if (x) x.b.disabled = !!d; };
  return el;
}

/* ---------------------------------------------------------------- unit card */
export function card(def, o) {
  o = o || {};
  const fc = factionColor(o.factions, def.faction);
  const locked = !!o.locked;
  let why = o.reason || '';
  const el = h('button', { type: 'button', class: ['vw-card', locked && 'is-locked', o.compact && 'vw-card--compact', o.class], 'aria-pressed': o.selected === undefined ? null : String(!!o.selected), 'aria-disabled': o.disabled ? 'true' : null, style: { '--fc': fc }, dataset: { id: def.id } });
  if (o.selected) el.classList.add('is-selected');
  if (o.disabled) el.classList.add('is-disabled');
  const nm = locked ? '???' : def.name;
  const top = h('span', { class: 'vw-card__top' },
    h('span', { class: 'vw-card__art' }, makeIcon(locked ? 'lock' : (ROLE_ICON[def.role] || 'sword'))),
    h('span', { class: 'vw-card__name', text: nm }),
    locked ? null : h('span', { class: 'vw-card__cost' }, makeIcon('coin'), fmtNum(def.cost)));
  el.appendChild(top);
  if (!locked) {
    const meta = h('span', { class: 'vw-card__meta' }, chip(ROLE_LABEL[def.role] || def.role, { variant: ROLE_CHIP[def.role] }));
    if (o.counters !== false) {
      const c = counterHints(def);
      if (c.beats[0]) meta.appendChild(chip('Beats ' + c.beats[0], { variant: 'olive' }));
      if (c.weak[0] && o.counters !== 'beats') meta.appendChild(chip('Weak: ' + c.weak[0], { variant: 'danger' }));
    }
    el.appendChild(meta);
    const blurb = o.blurb != null ? o.blurb : (def.text && def.text.blurb);
    if (blurb && !o.compact) el.appendChild(h('span', { class: 'vw-card__blurb', text: blurb }));
  } else if (o.reason) el.appendChild(h('span', { class: 'vw-card__blurb', text: o.reason }));
  const cnt = h('span', { class: 'vw-card__count vw-hide', 'aria-hidden': 'true' });
  el.appendChild(cnt);
  el.setCount = (n) => { cnt.textContent = String(n); cnt.classList.toggle('vw-hide', !n); };
  if (o.count) el.setCount(o.count);
  el.setSelected = (b) => { el.setAttribute('aria-pressed', String(!!b)); el.classList.toggle('is-selected', !!b); };
  el.setDisabled = (b, reason) => { why = reason || ''; el.classList.toggle('is-disabled', !!b); if (b) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled'); };
  el.addEventListener('pointerenter', (e) => { if (el.getAttribute('aria-disabled') !== 'true') hoverSfx(e); });
  el.addEventListener('click', (e) => {
    if (el.getAttribute('aria-disabled') === 'true' || locked) { sfx('ui_error'); if (why) toast(why, { kind: 'warn', ms: 2400, sound: false }); return; }
    sfx('ui_click'); if (o.onClick) o.onClick(e, def);
  });
  tooltip(el, () => (el.getAttribute('aria-disabled') === 'true' || locked ? why : ''));
  return el;
}

/* ---------------------------------------------------------------- tooltip (singleton) */
let tipEl = null, tipTimer = 0, tipHideTimer = 0, tipTarget = null;
function ensureTip() {
  if (!tipEl) { tipEl = h('div', { class: 'vw-tip', id: 'vw-tip', role: 'tooltip' }); appRoot().appendChild(tipEl); }
  else if (!tipEl.isConnected) appRoot().appendChild(tipEl);
  return tipEl;
}
function placeTip(x, y, w, hh, target) {
  const t = ensureTip();
  const tw = t.offsetWidth, th = t.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
  let left, top;
  if (target) {
    const r = target.getBoundingClientRect();
    left = r.left + r.width / 2 - tw / 2;
    top = r.top - th - 10;
    if (top < 8) top = r.bottom + 10;
  } else { left = x + 14; top = y + 18; if (left + tw > vw - 8) left = x - tw - 14; if (top + th > vh - 8) top = y - th - 14; }
  left = clamp(left, 8, Math.max(8, vw - tw - 8));
  top = clamp(top, 8, Math.max(8, vh - th - 8));
  t.style.left = left + 'px'; t.style.top = top + 'px';
}
export function showTip(o) {
  const t = ensureTip();
  clearTimeout(tipHideTimer);
  t.className = 'vw-tip' + (o.kind ? ' vw-tip--' + o.kind : '');
  t.textContent = o.text;
  placeTip(o.x || 0, o.y || 0, 0, 0, o.target || null);
  t.classList.add('is-on');
}
export function hideTip() {
  clearTimeout(tipTimer); clearTimeout(tipHideTimer);
  if (tipEl) tipEl.classList.remove('is-on');
  if (tipTarget) { tipTarget.removeAttribute('aria-describedby'); tipTarget = null; }
}
export function tooltip(el, text, o) {
  o = o || {};
  const get = () => (typeof text === 'function' ? text() : text);
  const show = () => {
    const s = get();
    if (!s) return;
    if (tipTarget && tipTarget !== el) tipTarget.removeAttribute('aria-describedby');
    tipTarget = el; el.setAttribute('aria-describedby', 'vw-tip');
    showTip({ text: s, target: el, kind: o.kind });
  };
  let pressTimer = 0;
  const onEnter = (e) => { if (e.pointerType === 'touch') return; clearTimeout(tipTimer); tipTimer = setTimeout(show, 350); };
  const onLeave = () => { hideTip(); };
  const onFocus = () => { let kb = false; try { kb = el.matches(':focus-visible'); } catch (e) { kb = false; } if (kb) { clearTimeout(tipTimer); show(); } };
  const onDown = (e) => { if (e.pointerType !== 'touch') { hideTip(); return; } clearTimeout(pressTimer); pressTimer = setTimeout(() => { show(); tipHideTimer = setTimeout(hideTip, 2600); }, 520); };
  const onUp = () => { clearTimeout(pressTimer); };
  const onKey = (e) => { if (e.key === 'Escape') hideTip(); };
  el.addEventListener('pointerenter', onEnter); el.addEventListener('pointerleave', onLeave); el.addEventListener('focus', onFocus); el.addEventListener('blur', onLeave);
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp); el.addEventListener('keydown', onKey);
  el.addEventListener('click', hideTip); el.addEventListener('contextmenu', (e) => { if (e.pointerType === 'touch') e.preventDefault(); });
  return () => {
    el.removeEventListener('pointerenter', onEnter); el.removeEventListener('pointerleave', onLeave); el.removeEventListener('focus', onFocus); el.removeEventListener('blur', onLeave);
    el.removeEventListener('click', hideTip); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); el.removeEventListener('keydown', onKey);
    if (tipTarget === el) hideTip();
  };
}

/* ---------------------------------------------------------------- toast */
const TOAST_ICON = { info: 'info', success: 'check', warn: 'warning', error: 'warning', achievement: 'trophy' };
/** Lift the toast stack above a screen's bottom bar (e.g. placement). Returns a restore function (call it in destroy()). */
export function toastInset(rem) {
  const r = appRoot();
  const prev = r.style.getPropertyValue('--toast-bottom');
  r.style.setProperty('--toast-bottom', typeof rem === 'number' ? rem + 'rem' : rem);
  return () => { if (prev) r.style.setProperty('--toast-bottom', prev); else r.style.removeProperty('--toast-bottom'); };
}
export function toast(text, o) {
  o = o || {};
  const kind = o.kind || 'info';
  let host = appRoot().querySelector(':scope > .vw-toasts');
  if (!host) { host = h('div', { class: 'vw-toasts', 'aria-live': 'polite' }); appRoot().appendChild(host); }
  while (host.children.length >= 4) host.firstChild.remove();
  const el = h('div', { class: 'vw-toast vw-toast--' + kind, role: kind === 'error' ? 'alert' : 'status' }, makeIcon(o.icon || TOAST_ICON[kind] || 'info'), h('span', { class: 'vw-toast__text', text: String(text) }));
  host.appendChild(el);
  anim(el, [{ opacity: 0, transform: 'translateY(18px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 320 });
  const snd = o.sound === undefined ? (kind === 'error' ? 'ui_error' : kind === 'achievement' ? 'ui_achievement' : null) : o.sound;
  if (snd) sfx(snd);
  let timer = 0, gone = false;
  const dismiss = () => {
    if (gone) return; gone = true; clearTimeout(timer);
    anim(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px)' }], { duration: 180, fill: 'forwards' }).then(() => el.remove());
    setTimeout(() => el.remove(), 380);
    if (reduced()) el.remove();
  };
  const arm = () => { clearTimeout(timer); timer = setTimeout(dismiss, o.ms || (kind === 'error' ? 5200 : 3600)); };
  el.addEventListener('pointerenter', () => clearTimeout(timer)); el.addEventListener('pointerleave', arm);
  el.addEventListener('click', dismiss);
  arm();
  el.dismiss = dismiss;
  return el;
}

/* ---------------------------------------------------------------- modal */
const MODALS = [];
let modalSeq = 0;
export function hasModal() { return MODALS.length > 0; }
export function closeModals(value) { while (MODALS.length) MODALS[MODALS.length - 1].close(value === undefined ? null : value); }

function setBackgroundInert(on, except) {
  const r = appRoot();
  Array.from(r.children).forEach((c) => {
    if (c === except || c.classList.contains('vw-modal-wrap') || c.classList.contains('vw-toasts') || c.classList.contains('vw-tip') || c.classList.contains('vw-banner-host')) return;
    if (on) { if (!c.hasAttribute('inert')) { c.setAttribute('inert', ''); c.dataset.vwInert = '1'; } }
    else if (c.dataset.vwInert) { c.removeAttribute('inert'); delete c.dataset.vwInert; }
  });
}
export function modal(opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    const id = 'vw-modal-' + (++modalSeq);
    const prevFocus = document.activeElement;
    const dismissible = opts.dismissible !== false;
    const dismissValue = opts.dismissValue === undefined ? null : opts.dismissValue;
    const wrap = h('div', { class: 'vw-modal-wrap' });
    const dlg = h('div', { class: ['vw-modal', opts.wide && 'vw-modal--wide', opts.class], role: opts.alert ? 'alertdialog' : 'dialog', 'aria-modal': 'true', 'aria-labelledby': id + '-t', 'aria-describedby': id + '-b', id: opts.id || id, tabindex: '-1' });
    const head = h('div', { class: 'vw-modal__head' }, opts.icon ? makeIcon(opts.icon) : null, h('h2', { class: 'vw-modal__title', id: id + '-t', text: opts.title || '' }));
    const body = h('div', { class: 'vw-modal__body', id: id + '-b' });
    const foot = h('div', { class: 'vw-modal__foot' });
    let done = false;
    const entry = { close };
    function close(value) {
      if (done) return; done = true;
      const i = MODALS.indexOf(entry); if (i >= 0) MODALS.splice(i, 1);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocusIn, true);
      if (MODALS.length === 0) setBackgroundInert(false);
      else MODALS[MODALS.length - 1].wrap.removeAttribute('inert');
      resolve(value);
      const f = () => wrap.remove();
      anim(dlg, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px) scale(.97)' }], { duration: 140, fill: 'forwards' }).then(f);
      setTimeout(f, 320);
      if (reduced()) f();
      if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === 'function') { try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }
    entry.wrap = wrap;
    const api = { close, el: dlg, body, foot };
    if (typeof opts.body === 'function') appendKids(body, [opts.body(api)]);
    else if (typeof opts.body === 'string') opts.body.split('\n\n').forEach((p) => body.appendChild(h('p', { text: p })));
    else if (opts.body) appendKids(body, [opts.body]);
    const buttons = opts.buttons && opts.buttons.length ? opts.buttons : [{ label: 'OK', variant: 'primary', value: true }];
    let autoBtn = null;
    buttons.forEach((bd, i) => {
      const b = button(bd.label, { variant: bd.variant || (i === buttons.length - 1 ? 'primary' : 'secondary'), size: 'md', sound: bd.cancel || bd.variant === 'ghost' ? 'ui_back' : undefined, icon: bd.icon, id: bd.id,
        onClick: () => { if (bd.onClick) bd.onClick(api); if (!bd.keep) close(bd.value === undefined ? bd.label : bd.value); } });
      foot.appendChild(b);
      if (bd.primary || (opts.focus === 'primary' && (bd.variant === 'primary' || bd.variant === 'danger')) || (opts.focus === 'cancel' && bd.cancel) || opts.focus === i) autoBtn = autoBtn || b;
    });
    if (opts.showClose !== false && dismissible) head.appendChild(iconButton('x', 'Close', { class: 'vw-modal__x', variant: 'ghost', sound: 'ui_back', onClick: () => close(dismissValue) }));
    dlg.append(head, body, foot);
    wrap.appendChild(dlg);
    if (MODALS.length) MODALS[MODALS.length - 1].wrap.setAttribute('inert', '');
    appRoot().appendChild(wrap);
    setBackgroundInert(true, wrap);
    MODALS.push(entry);
    function onKey(e) {
      if (MODALS[MODALS.length - 1] !== entry) return;
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        if (dismissible) { sfx('ui_back'); close(dismissValue); } else sfx('ui_error');
        return;
      }
      if (e.key === 'Tab') {
        const f = focusables(dlg);
        if (!f.length) { e.preventDefault(); dlg.focus(); return; }
        const first = f[0], last = f[f.length - 1], a = document.activeElement;
        if (e.shiftKey && (a === first || !dlg.contains(a))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (a === last || !dlg.contains(a))) { e.preventDefault(); first.focus(); }
      }
    }
    function onFocusIn(e) {
      if (MODALS[MODALS.length - 1] !== entry) return;
      if (!dlg.contains(e.target)) { const f = focusables(dlg); (f[0] || dlg).focus(); }
    }
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocusIn, true);
    if (dismissible) wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) { sfx('ui_back'); close(dismissValue); } });
    anim(dlg, [{ opacity: 0, transform: 'translateY(18px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
    sfx('ui_panel_open');
    const initial = autoBtn || (focusables(body)[0]) || foot.querySelector('button:last-of-type') || dlg;
    initial.focus();
  });
}
export function ask(o) {
  o = o || {};
  return modal({
    title: o.title || 'Are you sure?', body: o.text || '', alert: !!o.danger, icon: o.danger ? 'warning' : null, dismissValue: false, focus: o.danger ? 'cancel' : 'primary',
    buttons: [{ label: o.no || 'Cancel', variant: 'secondary', value: false, cancel: true }, { label: o.yes || 'OK', variant: o.danger ? 'danger' : 'primary', value: true }],
  });
}
/** Modal with a text area (read-only export/copy, or paste-in import). Resolves the text on OK, null on cancel.
 *  o.onSubmit(text) may return an error string (or a Promise of one): the modal then stays open and shows it. */
export function textModal(o) {
  o = o || {};
  const ta = h('textarea', { class: 'vw-input', rows: o.rows || 8, 'aria-label': o.label || o.title || 'Text', readonly: o.readOnly ? true : null, spellcheck: 'false', autocomplete: 'off' });
  ta.value = o.text || '';
  if (o.placeholder) ta.setAttribute('placeholder', o.placeholder);
  const err = h('p', { class: 'vw-note vw-note--bad vw-hide', role: 'alert' });
  const showErr = (m) => { err.textContent = m || ''; err.classList.toggle('vw-hide', !m); };
  return modal({
    title: o.title || 'Text', wide: true, dismissValue: null,
    body: () => h('div', { class: 'vw-col' }, o.note ? h('p', { text: o.note }) : null, ta, err),
    buttons: o.readOnly
      ? [{ label: 'Close', variant: 'secondary', value: null, cancel: true }, o.copy === false ? null : { label: 'Select all', variant: 'primary', keep: true, id: 'vw-textmodal-select', onClick: () => { ta.focus(); ta.select(); } }].filter(Boolean)
      : [{ label: 'Cancel', variant: 'secondary', value: null, cancel: true },
        { label: o.ok || 'OK', variant: 'primary', keep: true, id: 'vw-textmodal-ok', onClick: async (api) => {
          showErr('');
          let msg = null;
          if (o.onSubmit) { try { msg = await o.onSubmit(ta.value); } catch (e) { msg = (e && e.message) || 'That did not work.'; } }
          if (msg) { showErr(msg); sfx('ui_error'); ta.focus(); } else api.close(ta.value);
        } }],
  }).then((v) => (o.readOnly ? v : (typeof v === 'string' ? v : null)));
}

/* ---------------------------------------------------------------- banner / progress / meter / kbd / toolbar / empty */
export function banner(text, o) {
  o = o || {};
  let host = appRoot().querySelector(':scope > .vw-banner-host');
  if (!host) { host = h('div', { class: 'vw-banner-host', 'aria-live': 'polite' }); appRoot().appendChild(host); }
  const el = h('div', { class: 'vw-banner' + (o.kind && o.kind !== 'gold' ? ' vw-banner--' + o.kind : ''), role: 'status' }, h('span', { class: 'vw-banner__text', text: String(text) }));
  host.appendChild(el);
  anim(el, [{ opacity: 0, transform: 'scale(.4) rotate(-10deg)' }, { opacity: 1, transform: 'scale(1) rotate(-2deg)' }], { duration: 520, fill: 'backwards' });
  let gone = false, timer = 0;
  const hide = () => {
    if (gone) return; gone = true; clearTimeout(timer);
    anim(el, [{ opacity: 1, transform: 'rotate(-2deg)' }, { opacity: 0, transform: 'translateY(-26px) rotate(-2deg) scale(.96)' }], { duration: 260, fill: 'forwards' }).then(() => el.remove());
    setTimeout(() => el.remove(), 460);
    if (reduced()) el.remove();
  };
  if (o.ms !== 0) timer = setTimeout(hide, o.ms || 1900);
  el.hide = hide;
  return el;
}
export function progress(o) {
  o = o || {};
  const el = h('div', { class: ['vw-progress', o.tone && 'vw-progress--' + o.tone, o.thin && 'vw-progress--thin', o.tall && 'vw-progress--tall', o.class], id: o.id, role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(o.max != null ? o.max : 1), 'aria-label': o.aria || o.label || 'Progress' },
    h('div', { class: 'vw-progress__fill' }), o.label !== false && o.showLabel !== false ? h('div', { class: 'vw-progress__label' }) : null);
  const lab = el.querySelector('.vw-progress__label');
  let mx = o.max != null ? o.max : 1;
  el.setMax = (m) => { mx = m; el.setAttribute('aria-valuemax', String(m)); };
  el.set = (v, text, over) => {
    const f = clamp(mx ? v / mx : 0, 0, 1);
    el.style.setProperty('--v', String(f));
    el.setAttribute('aria-valuenow', String(v));
    if (text != null) el.setAttribute('aria-valuetext', text);
    if (lab) lab.textContent = text != null ? text : (typeof o.label === 'string' ? o.label : '');
    el.classList.toggle('is-over', !!over);
  };
  // optional tick (e.g. a puzzle's par): el.setMark(fraction 0..1 | null, label?)
  let mark = null;
  el.setMark = (f, label) => {
    if (f == null || !isFinite(f)) { if (mark) { mark.remove(); mark = null; } return; }
    if (!mark) { mark = h('span', { class: 'vw-progress__mark', 'aria-hidden': 'true' }); el.appendChild(mark); }
    mark.style.setProperty('--m', String(clamp(f, 0, 1)));
    if (label) mark.title = label;
  };
  el.set(o.value || 0, typeof o.label === 'string' ? o.label : null);
  return el;
}
export function meter(o) {
  o = o || {};
  const na = h('span', { class: 'vw-meter__na' }), nb = h('span', { class: 'vw-meter__nb' });
  const bar = h('div', { class: 'vw-meter__bar' }, h('div', { class: 'vw-meter__a' }), h('div', { class: 'vw-meter__div' }));
  const el = h('div', { class: ['vw-meter', o.class], role: 'img' }, na, bar, nb);
  el.set = (a, b) => {
    const t = a + b;
    el.style.setProperty('--a', String(t > 0 ? a / t : 0.5));
    na.textContent = String(Math.round(a)); nb.textContent = String(Math.round(b));
    el.setAttribute('aria-label', `${o.labelA || 'Team A'} ${Math.round(a)} versus ${o.labelB || 'Team B'} ${Math.round(b)}`);
  };
  el.set(o.a != null ? o.a : 1, o.b != null ? o.b : 1);
  return el;
}
export function kbd(key, o) {
  const label = KEY_NAMES[key] || /^(Key[A-Z]|Digit\d|Numpad)/.test(key) ? keyLabel(key) : key;
  return h('kbd', { class: ['vw-kbd', o && o.dark && 'vw-kbd--dark'], text: label });
}
export function toolbar(children, o) {
  o = o || {};
  const el = h('div', { class: ['vw-toolbar', o.class], role: 'toolbar', id: o.id, 'aria-label': o.label || null, 'aria-orientation': o.vertical ? 'vertical' : null });
  for (const c of children) {
    if (c === '|') el.appendChild(h('span', { class: 'vw-toolbar__sep', role: 'separator', 'aria-hidden': 'true' }));
    else if (c) el.appendChild(c);
  }
  roving(el, { selector: 'button:not([disabled]),select:not([disabled]),input:not([disabled])', orientation: o.vertical ? 'vertical' : 'horizontal' });
  return el;
}
export function emptyState(o) {
  o = o || {};
  const el = h('div', { class: ['vw-empty', o.class] }, h('div', { class: 'vw-empty__icon' }, makeIcon(o.icon || 'cube')), o.title ? h('div', { class: 'vw-empty__title', text: o.title }) : null, o.text ? h('p', { class: 'vw-empty__text', text: o.text }) : null);
  if (o.action) el.appendChild(o.action instanceof Node ? o.action : button(o.action.label, Object.assign({ variant: 'primary' }, o.action)));
  return el;
}

/* ---------------------------------------------------------------- layout helpers */
export function field(label, control, o) {
  o = o || {};
  const lab = h('div', { class: 'vw-field__label' }, h('span', { text: label }));
  const el = h('div', { class: ['vw-field', o.stack && 'vw-field--stack', o.class], id: o.id }, lab);
  if (o.info) { const i = h('span', { class: 'vw-field__info', tabindex: '0', role: 'img', 'aria-label': 'More info: ' + o.info }, makeIcon('info')); tooltip(i, o.info); lab.appendChild(i); }
  if (o.hint) el.appendChild(h('div', { class: 'vw-field__hint', text: o.hint }));
  el.appendChild(h('div', { class: 'vw-field__ctl' }, control));
  return el;
}
export function statBar(label, value, max, o) {
  o = o || {};
  const p = progress({ value, max, tone: o.tone || 'gold', thin: true, label: false, aria: label });
  p.set(value, null);
  return h('div', { class: 'vw-stat' }, h('span', { class: 'vw-stat__label', text: label }), p, h('span', { class: 'vw-stat__val', text: o.text != null ? o.text : String(value) }));
}
export function divider() { return h('hr', { class: 'vw-divider' }); }
export function note(text, kind) { return h('p', { class: 'vw-note' + (kind ? ' vw-note--' + kind : ''), text }); }
export function searchBox(o) {
  o = o || {};
  const input = h('input', { type: 'search', class: 'vw-input', id: o.id, 'aria-label': o.label || 'Search', autocomplete: 'off', spellcheck: 'false', value: o.value || '' });
  if (o.placeholder) input.setAttribute('placeholder', o.placeholder);
  input.addEventListener('input', () => { if (o.onInput) o.onInput(input.value); });
  const el = h('div', { class: ['vw-search', o.class] }, makeIcon('search'), input);
  el.input = input;
  return el;
}
let bgSeq = 0;
export function backdrop(o) {
  o = o || {};
  const el = h('div', { class: ['vw-bg', o.night && 'vw-bg--night'], 'aria-hidden': 'true' }, h('div', { class: 'vw-bg__sun' }));
  const spec = [[8, 18, 1.1, -10], [34, 62, .8, -32], [58, 28, 1.3, -48], [82, 70, .9, -20], [18, 80, 1.5, -58]];
  for (const [x, y, s, d] of spec) el.appendChild(h('div', { class: 'vw-cloud', style: { '--x': x + '%', '--y': y + '%', '--s': s, '--d': d + 's', top: y + '%' } }));
  bgSeq++;
  return el;
}
export function muteButton() {
  const el = iconButton('volume', 'Mute sound', { variant: 'ghost', sound: false, id: 'vw-mute-' + (++toggleSeq) });
  const paint = () => {
    let m = false; try { m = !!(CTX && CTX.settings.get('muted')); } catch (e) { m = false; }
    el.setAttribute('aria-pressed', String(m));
    el.setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound');
    const f = el.querySelector('.vw-btn__face');
    f.replaceChild(makeIcon(m ? 'mute' : 'volume', { class: 'vw-btn__icon' }), f.firstChild);
  };
  el.addEventListener('click', () => { if (!CTX) return; const m = !CTX.settings.get('muted'); CTX.settings.set('muted', m); paint(); if (!m) sfx('ui_click'); });
  let off = null;
  if (CTX && CTX.settings && typeof CTX.settings.on === 'function') off = CTX.settings.on(paint);
  el.destroy = () => { if (typeof off === 'function') off(); };
  tooltip(el, () => (el.getAttribute('aria-pressed') === 'true' ? 'Sound is off. Click to unmute.' : 'Mute all sound'));
  paint();
  return el;
}
export function pageFrame(o) {
  o = o || {};
  const cleanups = [];
  const el = h('div', { class: ['vw-page', o.class], id: o.id });
  const bar = h('header', { class: 'vw-page__bar' });
  if (o.onBack !== false) {
    bar.appendChild(button(o.backLabel || 'Back', { icon: 'back', variant: 'secondary', sound: 'ui_back', id: (o.id || 'page') + '-back', aria: o.backAria || null, onClick: () => { if (o.onBack) o.onBack(); else if (CTX) CTX.nav.back(); } }));
  }
  const tw = h('div', { class: 'vw-grow' }, h('h1', { class: 'vw-page__title', text: o.title || '' }));
  if (o.sub) tw.appendChild(h('div', { class: 'vw-page__sub', text: o.sub }));
  bar.appendChild(tw);
  if (o.actions) for (const a of o.actions) bar.appendChild(a);
  if (o.mute !== false) { const m = muteButton(); cleanups.push(() => m.destroy && m.destroy()); bar.appendChild(m); }
  const scroll = h('main', { class: 'vw-page__scroll' });
  const content = h('div', { class: 'vw-wrap' });
  scroll.appendChild(content);
  el.append(bar, scroll);
  const frag = { el, bar, scroll, content, title: bar.querySelector('.vw-page__title'), bg: o.bg !== false ? backdrop({ night: !!o.night }) : null,
    mount(parent) { if (frag.bg) parent.appendChild(frag.bg); parent.appendChild(el); return frag; },
    destroy() { cleanups.forEach((f) => f()); } };
  return frag;
}

/* ---------------------------------------------------------------- clipboard with a text-selection fallback */
export async function copyText(text, o) {
  o = o || {};
  let ok = false;
  try {
    if (CTX && CTX.platform && typeof CTX.platform.clipboard === 'function') ok = !!(await CTX.platform.clipboard(text));
    else if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; }
  } catch (e) { ok = false; }
  if (ok) { toast(o.done || 'Copied to clipboard.', { kind: 'success' }); return true; }
  const f = (KT.common && KT.common.clipboardFail) || null;   // HUMOR ERRORS.clipboard
  await textModal({ title: o.title || (f && f.title) || 'Copy this text', text, readOnly: true, note: (f && f.body) || 'Your browser blocked automatic copying. Select the text below and press Ctrl/Cmd+C.' });
  return false;
}
