// armymeter.js: top-centre A-vs-B strength meter (unit counts, cost remaining, lead chip with pulse on lead change).
// HUD module contract: mount(parent, ctx) -> { update(hud, dt), destroy() }. Writes only on change, textContent only, bars move by transform.
import { h, setText, setScaleX, setCls, fmtInt, anim, clamp } from './_dom.js';
import { icon } from './_icons.js';

export const meta = { id: 'armymeter', slot: 'top-center', order: 1 };

function side(t) {
  const key = t === 0 ? 'a' : 'b';
  const name = h('span', { class: 'hud-army-name' });
  const count = h('span', { class: 'hud-army-count', 'aria-hidden': 'true' });
  const ghost = h('i', { class: 'hud-bar-ghost' });
  const fill = h('i', { class: 'hud-bar-fill' });
  const bar = h('div', { class: 'hud-bar hud-army-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100' }, ghost, fill);
  const cost = h('span', { class: 'hud-army-cost' });
  const badge = h('span', { class: 'hud-team-badge', 'aria-hidden': 'true' }, icon(t === 0 ? 'hold' : 'sword'));
  const el = h('div', { class: 'hud-army-side is-' + key, 'data-team': key }, badge,
    h('div', { class: 'hud-army-col' }, h('div', { class: 'hud-army-top' }, name, count), bar, cost));
  return { el, name, count, ghost, fill, bar, cost, key, frac: -1, alive: -1, badge };
}

export function mount(parent, ctx) {
  const A = side(0), B = side(1);
  const lead = h('span', { class: 'hud-lead', 'aria-hidden': 'true' });
  const mid = h('div', { class: 'hud-army-mid' }, lead);
  const sr = h('span', { class: 'vw-sr', 'aria-live': 'polite' });
  const el = h('div', { class: 'hud-army hud-panel', 'data-hud': 'army', role: 'group', 'aria-label': 'Army strength' }, A.el, mid, B.el, sr);
  parent.appendChild(el);

  let leadTeam = -2, lastLeadChange = -99, srT = 0;

  function paint(s, t) {
    if (!t) return;
    const frac = t.costStart > 0 ? clamp(t.cost / t.costStart, 0, 1) : clamp(t.alive / (t.start || t.alive || 1), 0, 1);
    setText(s.name, t.name || (s.key === 'a' ? 'Army A' : 'Army B'));
    setText(s.count, fmtInt(t.alive));
    setText(s.cost, t.costStart > 0 ? fmtInt(t.cost) + ' dr' : '');
    setScaleX(s.fill, frac);
    setScaleX(s.ghost, frac);
    setCls(s.el, 'is-low', frac < 0.25 && t.alive > 0);
    setCls(s.el, 'is-out', t.alive <= 0);
    const pct = Math.round(frac * 100);
    if (s.pct !== pct) { s.pct = pct; s.bar.setAttribute('aria-valuenow', String(pct)); s.bar.setAttribute('aria-label', (t.name || s.key.toUpperCase()) + ' strength'); }
    s.frac = frac;
  }

  return {
    el,
    slots: { mid },
    update(hud) {
      const ts = hud && hud.teams;
      if (!ts || ts.length < 2) return;
      const a = ts[0], b = ts[1];
      paint(A, a); paint(B, b);
      // lead by remaining cost (strength); 3% dead-band so the chip does not flicker
      const pa = a.costStart > 0 ? a.cost : a.alive, pb = b.costStart > 0 ? b.cost : b.alive;
      const hi = Math.max(pa, pb), lo = Math.min(pa, pb);
      const diff = hi > 0 ? (hi - lo) / hi : 0;
      let lt = leadTeam;
      if (diff < 0.03) lt = -1;
      else if (diff > 0.06 || leadTeam === -2 || leadTeam === -1) lt = pa > pb ? 0 : 1;
      if (lt !== leadTeam) {
        const first = leadTeam === -2;
        const flip = !first && leadTeam >= 0 && lt >= 0;
        leadTeam = lt;
        setCls(lead, 'is-a', lt === 0); setCls(lead, 'is-b', lt === 1); setCls(lead, 'is-even', lt === -1);
        if (flip) {
          anim(ctx, lead, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 1, offset: 0.3 }, { transform: 'scale(1)', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.34,1.56,.64,1)' }, [{ opacity: 0.4 }, { opacity: 1 }]);
          anim(ctx, el, [{ transform: 'translateY(0)' }, { transform: 'translateY(3px)', offset: 0.25 }, { transform: 'translateY(0)' }], { duration: 380, easing: 'ease-out' });
          lastLeadChange = hud.time || 0;
        }
      }
      setText(lead, lt === -1 ? 'EVEN' : '+' + Math.round(diff * 100) + '%');
      const leadName = lt === 0 ? a.name : lt === 1 ? b.name : '';
      // screen-reader summary once every ~5 s of battle time, not every tick
      const tNow = hud.time || 0;
      if (tNow - srT >= 5 || (lastLeadChange === tNow && tNow !== srT)) {
        srT = tNow;
        setText(sr, a.name + ' ' + a.alive + ' units, ' + b.name + ' ' + b.alive + ' units' + (leadName ? ', ' + leadName + ' leads' : ', even'));
      }
    },
    destroy() { el.remove(); },
  };
}
