// teaching.js: mission-1 teaching beats. A hint card with an arrow + pulsing ring on the UI element it talks about, step dots and a visible Skip button.
// hud.teaching = { id, index, total, title?, text, target?, who?, canSkip?, ack? } | null  (driven by the Game; steps advance when the player does the thing).
// target: a HUD part id ('powers','army','objective','minimap','speed','orders','announcer','selection','camera') or any CSS selector ('#id', '.class', '[data-x]').
// Skip -> game.skipTeaching() and settings.seenHints.teaching = true.  Positions are measured once per step (rAF), never inside update().
import { h, setText, setHidden, setCls, sfx, disposer, anim } from './_dom.js';
import { avatar } from './_portraits.js';

export const meta = { id: 'teaching', slot: 'overlay', order: 7 };

export function mount(parent, ctx) {
  const d = disposer();
  const who = h('div', { class: 'hud-teach-who' });
  const title = h('h3', { class: 'hud-teach-title' });
  const text = h('p', { class: 'hud-teach-text' });
  const dots = h('div', { class: 'hud-teach-dots', 'aria-hidden': 'true' });
  const skip = h('button', { class: 'hud-btn hud-teach-skip', type: 'button', id: 'hud-teach-skip', text: 'Skip tutorial' });
  const got = h('button', { class: 'hud-btn hud-teach-got is-gold', type: 'button', id: 'hud-teach-got', text: 'Got it', hidden: true });
  const arrow = h('i', { class: 'hud-teach-arrow', 'aria-hidden': 'true' });
  const card = h('div', { class: 'hud-teach-card hud-panel', role: 'status', 'aria-live': 'polite', 'data-side': 'above' }, arrow, who, h('div', { class: 'hud-teach-main' }, title, text, h('div', { class: 'hud-teach-foot' }, dots, got, skip)));
  const ring = h('div', { class: 'hud-teach-ring', 'aria-hidden': 'true', hidden: true });
  const el = h('div', { class: 'hud-teach', hidden: true, 'data-hud': 'teaching' }, ring, card);
  parent.appendChild(el);

  let stepKey = '', raf = 0, current = null, dismissed = false, face = '';
  try { const sh = ctx.settings.get('seenHints'); dismissed = !!(sh && sh.teaching); } catch (e) { dismissed = false; }

  function findTarget(t) {
    if (!t) return null;
    const root = el.closest('.vw-hud') || document;
    if (/^[#.\[]/.test(t)) return root.querySelector(t) || document.querySelector(t);
    return root.querySelector('[data-hud="' + t + '"]');
  }
  function place() {
    raf = 0;
    if (!current) return;
    const root = el.closest('.vw-hud') || el.parentElement;
    const rr = root.getBoundingClientRect();
    const tgt = findTarget(current.target);
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let x, y, side = 'above', ax = 0.5;
    if (tgt) {
      const tr = tgt.getBoundingClientRect();
      ring.hidden = false;
      ring.style.transform = 'translate(' + Math.round(tr.left - rr.left - 6) + 'px,' + Math.round(tr.top - rr.top - 6) + 'px)';
      ring.style.width = Math.round(tr.width + 12) + 'px'; ring.style.height = Math.round(tr.height + 12) + 'px';
      const cx = tr.left - rr.left + tr.width / 2, mid = (tr.top - rr.top) + tr.height / 2;
      side = mid > rr.height * 0.5 ? 'above' : 'below';
      x = Math.max(8, Math.min(rr.width - cw - 8, cx - cw / 2));
      y = side === 'above' ? tr.top - rr.top - ch - 22 : tr.bottom - rr.top + 22;
      y = Math.max(8, Math.min(rr.height - ch - 8, y));
      ax = Math.max(0.1, Math.min(0.9, (cx - x) / cw));
    } else {
      ring.hidden = true; side = 'none';
      x = (rr.width - cw) / 2; y = rr.height * 0.28;
    }
    card.dataset.side = side;
    card.style.setProperty('--ax', (ax * 100).toFixed(1) + '%');
    card.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(place); };
  d.on(window, 'resize', schedule);

  function doSkip() {
    dismissed = true;
    try { const sh = Object.assign({}, ctx.settings.get('seenHints') || {}, { teaching: true }); ctx.settings.set('seenHints', sh); } catch (e) { /* settings optional */ }
    try { ctx.game && ctx.game.skipTeaching && ctx.game.skipTeaching(); } catch (e) { /* not ready */ }
    setHidden(el, true); sfx(ctx, 'ui_back', { vol: 0.5 });
  }
  skip.addEventListener('click', doSkip);
  got.addEventListener('click', () => { try { ctx.game && ctx.game.teachingNext && ctx.game.teachingNext(); } catch (e) { /* not ready */ } sfx(ctx, 'ui_confirm', { vol: 0.5 }); });

  return {
    el, skip: doSkip, reposition: schedule,
    update(hud) {
      const t = hud.teaching;
      if (!t || dismissed) { if (!el.hidden) { setHidden(el, true); current = null; stepKey = ''; } return; }
      current = t;
      const key = t.id + '|' + t.index + '|' + t.text;
      setHidden(el, false);
      if (key === stepKey) return;
      stepKey = key;
      setText(title, t.title || ''); setHidden(title, !t.title);
      setText(text, t.text || '');
      setHidden(got, !t.ack); setHidden(skip, t.canSkip === false);
      const w = t.who || 'brutus';
      if (face !== w) { face = w; who.replaceChildren(avatar(w)); }
      const n = t.total || 1;
      dots.replaceChildren(...Array.from({ length: n }, (_, i) => h('i', { class: i === (t.index | 0) ? 'is-on' : i < (t.index | 0) ? 'is-done' : '' })));
      setCls(card, 'is-final', (t.index | 0) >= n - 1);
      schedule();
      anim(ctx, card, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    },
    destroy() { if (raf) cancelAnimationFrame(raf); d.run(); el.remove(); },
  };
}
