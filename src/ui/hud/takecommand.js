// takecommand.js: Take Command overlay. Banner (who you are + hp + Exit), 3 ability buttons with cooldowns, and on touch a virtual joystick + attack button.
// hud.possess = { id, name, hp, hpMax, abilities:[{id,name,key,cd,cdMax,ready}] } | null.
// Input goes to ctx.game.possessInput(patch) with patch = { move?:{x,y} (-1..1, screen space, y<0 = forward), attack?:true, ability?:1|2|3, sprint?:bool };
// when the Game does not offer it the same patch is dispatched as a 'vw:possess-input' CustomEvent on window.
import { h, setText, setCls, setHidden, setScaleX, setVar, setAttr, sfx, disposer, clamp, fmtInt } from './_dom.js';
import { icon } from './_icons.js';

export const meta = { id: 'takecommand', slot: 'overlay', order: 5, keepHidden: true };

export function mount(parent, ctx, layers) {
  const d = disposer();
  const touch = !!((ctx.platform && ctx.platform.isTouch) || (layers && layers.forceTouch));
  const send = (patch) => {
    try {
      if (ctx.game && ctx.game.possessInput) ctx.game.possessInput(patch);
      else window.dispatchEvent(new CustomEvent('vw:possess-input', { detail: patch }));
    } catch (e) { /* game not ready */ }
  };

  const nameEl = h('span', { class: 'hud-tc-name' });
  const hpFill = h('i', { class: 'hud-bar-fill' });
  const hpTx = h('span', { class: 'hud-tc-hp' });
  const exit = h('button', { class: 'hud-btn hud-tc-exit', type: 'button', id: 'hud-tc-exit', 'data-tip': 'Back to godhood (Esc)', 'data-tip-pos': 'below' }, icon('exit'), h('span', { text: 'Exit' }));
  const banner = h('div', { class: 'hud-tc-banner hud-panel', 'data-hud': 'takecommand' }, icon('joystick'),
    h('div', { class: 'hud-tc-who' }, h('span', { class: 'hud-tc-label', text: 'In command' }), nameEl, h('div', { class: 'hud-bar hud-tc-bar' }, hpFill)), hpTx, exit);

  const abilities = [1, 2, 3].map((n) => {
    const sweep = h('i', { class: 'hud-power-sweep' });
    const cd = h('span', { class: 'hud-power-cd' });
    const ic = h('span', { class: 'hud-power-ic' }, icon(n === 1 ? 'sword' : n === 2 ? 'hold' : 'haste'));
    const el = h('button', { class: 'hud-power hud-tc-ab', type: 'button', id: 'hud-tc-ab' + n, 'data-tip-pos': 'above', 'data-tip': 'Ability ' + n, 'aria-label': 'Ability ' + n }, ic, sweep, cd, h('kbd', { class: 'hud-power-key', text: String(n) }));
    el.addEventListener('click', () => { send({ ability: n }); sfx(ctx, 'ui_click', { vol: 0.5 }); });
    return { el, sweep, cd, n, ready: true };
  });
  const bar = h('div', { class: 'hud-tc-abilities hud-panel', role: 'toolbar', 'aria-label': 'Abilities' }, abilities.map((a) => a.el));

  const root = h('div', { class: 'hud-tc', hidden: true }, banner);
  const slot = layers && layers.slots && layers.slots['bottom-center'];
  parent.appendChild(root);
  (slot || root).appendChild(bar);
  setHidden(bar, true);

  // virtual joystick + attack (touch only)
  let joy = null;
  if (touch) {
    const thumb = h('i', { class: 'hud-joy-thumb' });
    const base = h('div', { class: 'hud-joy', id: 'hud-joystick', role: 'application', 'aria-label': 'Move: virtual joystick' }, thumb);
    const atk = h('button', { class: 'hud-tc-attack', type: 'button', id: 'hud-tc-attack', 'aria-label': 'Attack' }, icon('sword'), h('span', { text: 'Attack' }));
    let id = null, cx = 0, cy = 0, rad = 1, last = '';
    const move = (e) => {
      let dx = (e.clientX - cx) / rad, dy = (e.clientY - cy) / rad;
      const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      thumb.style.transform = 'translate(' + Math.round(dx * rad * 0.8) + 'px,' + Math.round(dy * rad * 0.8) + 'px)';
      const sprint = m > 1.15;
      const k = dx.toFixed(2) + ',' + dy.toFixed(2) + sprint;
      if (k !== last) { last = k; send({ move: { x: +dx.toFixed(3), y: +dy.toFixed(3) }, sprint }); }
    };
    base.addEventListener('pointerdown', (e) => {
      if (id !== null) return; id = e.pointerId;
      try { base.setPointerCapture(id); } catch (err) { /* synthetic pointers */ }
      const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; rad = r.width / 2;
      base.classList.add('is-held'); move(e); e.preventDefault();
    });
    base.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; last = ''; base.classList.remove('is-held'); thumb.style.transform = 'translate(0,0)'; send({ move: { x: 0, y: 0 }, sprint: false }); };
    base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
    atk.addEventListener('pointerdown', (e) => { send({ attack: true }); sfx(ctx, 'ui_click', { vol: 0.5 }); e.preventDefault(); });
    root.append(base, atk);
    joy = { base, atk };
  }
  exit.addEventListener('click', () => { try { ctx.game && ctx.game.possess && ctx.game.possess(null); } catch (e) { /* not ready */ } });

  let on = false;
  return {
    el: root, joystick: joy, exit: () => exit.click(),
    update(hud) {
      const p = hud.possess;
      if (!!p !== on) { on = !!p; setHidden(root, !on); setHidden(bar, !on); const r = root.closest && root.closest('.vw-hud'); if (r) r.classList.toggle('possessing', on); }
      if (!p) return;
      setText(nameEl, p.name || 'Your soldier');
      setScaleX(hpFill, p.hpMax > 0 ? p.hp / p.hpMax : 0);
      setCls(banner, 'is-low', p.hpMax > 0 && p.hp / p.hpMax < 0.3);
      setText(hpTx, fmtInt(p.hp) + '/' + fmtInt(p.hpMax));
      const as = p.abilities || [];
      for (let i = 0; i < abilities.length; i++) {
        const a = abilities[i], s = as[i];
        setHidden(a.el, !s && i > 0);
        if (!s) continue;
        const frac = s.ready ? 0 : clamp(s.cd / (s.cdMax || 1), 0, 1);
        setVar(a.sweep, '--p', (Math.round(frac * 100) / 100).toString());
        setText(a.cd, s.ready ? '' : String(Math.ceil(s.cd)));
        setCls(a.el, 'is-ready', !!s.ready); setCls(a.el, 'is-cooling', !s.ready);
        setAttr(a.el, 'data-tip', (s.name || 'Ability ' + a.n) + (s.ready ? '' : ' (recharging)'));
        setAttr(a.el, 'aria-label', (s.name || 'Ability ' + a.n) + ', key ' + a.n);
      }
    },
    destroy() { d.run(); root.remove(); bar.remove(); },
  };
}
