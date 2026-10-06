// timer.js: battle clock (m:ss, optional limit countdown, speed badge). Mounted inside the army meter's middle slot by _hud.js.
import { h, setText, setCls, fmtTime } from './_dom.js';
import { icon } from './_icons.js';

export const meta = { id: 'timer', slot: 'army-mid', order: 2 };

export function mount(parent, ctx) {
  const t = h('span', { class: 'hud-time-text' });
  const lim = h('span', { class: 'hud-time-limit' });
  const spd = h('span', { class: 'hud-time-speed' });
  const el = h('div', { class: 'hud-timer', 'data-hud': 'timer', role: 'timer', 'aria-label': 'Battle time' }, icon('clock', 'hud-time-ic'), t, lim, spd);
  parent.insertBefore(el, parent.firstChild);
  return {
    el,
    update(hud) {
      const time = hud.time || 0;
      const limit = hud.timeLimit || (hud.objective && hud.objective.timeLimit) || 0;
      setText(t, fmtTime(time));
      setText(lim, limit > 0 ? '/ ' + fmtTime(limit) : '');
      setCls(el, 'is-warn', limit > 0 && limit - time <= 20 && limit - time > 0);
      setCls(el, 'is-paused', !!hud.paused);
      const sp = hud.speed || 1;
      setText(spd, sp === 1 ? '' : (sp < 1 ? String(sp).replace('0.', '.') : String(sp)) + 'x');
    },
    destroy() { el.remove(); },
  };
}
