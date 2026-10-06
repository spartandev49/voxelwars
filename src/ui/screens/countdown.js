// countdown.js: the 3-2-1 overlay and the FIGHT! beat. app/main.js opens this screen as an overlay on state 'countdown' and closes it when the
// battle starts, so the numerals live here and the FIGHT! flash (horn + shockwave) is mounted inside the battle screen (mountCountdown, fightOnly).
// Reduce Motion variant: numerals swap with a plain fade, FIGHT! is a static banner (no spring, no wobble, no shockwave).
import { h, anim, sfx, setText, reduced } from '../hud/_dom.js';
import { hornSvg } from '../hud/_art.js';

export const meta = { id: 'countdown', layer: 'battle', music: 'none', canvas: 'scene' };

const SUB = { 3: 'Steady, citizens.', 2: 'Shields up. Opinions down.', 1: 'Somebody tell the goat.' };
const FIGHT_SUB = ['Glory! Or lunch.', 'Do not look at the chickens.', 'Plan A: spears.', 'May the best formation win.'];

export function mountCountdown(parent, ctx, opts) {
  const o = Object.assign({ numbers: true, fight: true }, opts || {});
  const num = h('div', { class: 'bs-cd-num', 'aria-hidden': 'true' });
  const sub = h('div', { class: 'bs-cd-sub', 'aria-hidden': 'true' });
  const live = h('div', { class: 'vw-sr', role: 'status', 'aria-live': 'assertive' });
  const ring = h('i', { class: 'bs-cd-ring', 'aria-hidden': 'true' });
  const horn = h('div', { class: 'bs-cd-horn' }, hornSvg());
  const fightWord = h('div', { class: 'bs-cd-fight-word', text: 'FIGHT!' });
  const fightSub = h('div', { class: 'bs-cd-sub' });
  const fight = h('div', { class: 'bs-cd-fight', hidden: true, 'aria-hidden': 'true' }, ring, horn, fightWord, fightSub);
  const el = h('div', { class: 'bs-countdown' + (o.numbers ? '' : ' is-fight-only') }, num, sub, fight, live);
  parent.appendChild(el);

  let lastN = 0, prev = '', fightTimer = 0;
  function showNumber(n) {
    if (n === lastN) return;
    lastN = n;
    num.hidden = false; sub.hidden = false;
    setText(num, String(n)); setText(sub, SUB[n] || '');
    setText(live, String(n));
    anim(ctx, num, [{ transform: 'scale(2.1)' }, { transform: 'scale(1)', offset: 0.35 }, { transform: 'scale(.9)', offset: 0.85 }, { transform: 'scale(.8)' }], { duration: 900, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' });
    anim(ctx, num, [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.8 }, { opacity: 0.15 }], { duration: 900, easing: 'linear', fill: 'forwards' }, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0.2 }]);
    sfx(ctx, 'ui_countdown_beep', { vol: 0.7, pitch: 0.9 + (3 - n) * 0.12 });
  }
  function showFight() {
    num.hidden = true; sub.hidden = true; fight.hidden = false;
    setText(live, 'Fight!');
    setText(fightSub, FIGHT_SUB[(Math.random() * FIGHT_SUB.length) | 0]);
    sfx(ctx, 'ui_go', { vol: 0.8 });
    const rm = reduced(ctx);
    if (!rm) {
      anim(ctx, fightWord, [{ transform: 'scale(.3) rotate(-8deg)', opacity: 0 }, { transform: 'scale(1.25) rotate(2deg)', opacity: 1, offset: 0.4 }, { transform: 'scale(1) rotate(-2deg)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' });
      anim(ctx, horn, [{ transform: 'translateX(-60px) rotate(-14deg)', opacity: 0 }, { transform: 'translateX(0) rotate(6deg)', opacity: 1, offset: 0.35 }, { transform: 'translateX(0) rotate(-4deg)', opacity: 1, offset: 0.6 }, { transform: 'translateX(0) rotate(2deg)', opacity: 1 }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
      anim(ctx, ring, [{ transform: 'scale(.2)', opacity: 0.9 }, { transform: 'scale(3.2)', opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
    }
    clearTimeout(fightTimer);
    fightTimer = setTimeout(() => { anim(ctx, fight, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, fill: 'forwards' }, [{ opacity: 1 }, { opacity: 0 }]); setTimeout(() => { fight.hidden = true; }, 440); }, rm ? 1100 : 1300);
  }

  return {
    el,
    update(hud) {
      const s = hud && hud.state, n = (hud && hud.countdown) | 0;
      if (o.numbers && s === 'countdown' && n > 0) showNumber(n);
      if (o.fight && s === 'running' && prev === 'countdown') showFight();
      prev = s || prev;
    },
    fight: showFight, number: showNumber,
    destroy() { clearTimeout(fightTimer); el.remove(); },
  };
}

/** Screen: numerals only (FIGHT! is shown by the battle screen after this overlay is closed). */
export function mount(root, ctx) {
  root.classList.add('bs', 'bs-cd-screen');
  const cd = mountCountdown(root, ctx, { numbers: true, fight: false });
  const n0 = ctx.game && ctx.game.hud ? ctx.game.hud() : null;
  if (n0) cd.update(n0);
  const iv = setInterval(() => { try { const d = ctx.game.hud(); if (d) cd.update(d); } catch (e) { /* game not ready */ } }, 100);
  const off = ctx.game && ctx.game.on ? ctx.game.on('countdown', (p) => { if (p && p.n) cd.number(p.n | 0); }) : null;
  return { destroy() { clearInterval(iv); if (typeof off === 'function') off(); cd.destroy(); } };
}
