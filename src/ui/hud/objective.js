// objective.js: top-centre objective tracker: progress ring + text + detail line + marker hint chips.
// hud.objective = { id, text, progress 0..1, state:'active'|'won'|'failed', detail?, markers?:[{id,type,label}], timeLimit? } | null
// With no objective the tracker shows the default "eliminate" goal and fills with the enemy's lost strength.
import { h, svg, setText, setCls, setHidden, setAttr, clamp, anim } from './_dom.js';
import { icon } from './_icons.js';

export const meta = { id: 'objective', slot: 'top-center', order: 3 };

const KIND_ICON = { eliminate: 'skull', kill_general: 'crown', hold_hill: 'flag', protect_vip: 'goat', survive_waves: 'wave', destroy: 'tower', timeout: 'clock' };
const KIND_LABEL = { eliminate: 'Defeat the enemy army', kill_general: 'Kill the general', hold_hill: 'Hold the hill', protect_vip: 'Protect the VIP', survive_waves: 'Survive the waves', destroy: 'Destroy the target' };
const MARKER_ICON = { hill: 'flag', exit: 'diamond', vip_start: 'goat', general_spawn: 'crown', waypoint: 'diamond' };
const R = 11, C = 2 * Math.PI * R;

export function mount(parent, ctx) {
  const track = svg('circle', { class: 'hud-ring-track', cx: 14, cy: 14, r: R });
  const prog = svg('circle', { class: 'hud-ring-prog', cx: 14, cy: 14, r: R, 'stroke-dasharray': C.toFixed(2), 'stroke-dashoffset': C.toFixed(2), transform: 'rotate(-90 14 14)' });
  const ring = svg('svg', { class: 'hud-ring', viewBox: '0 0 28 28', 'aria-hidden': 'true' }, track, prog);
  const ico = h('span', { class: 'hud-obj-ico' }, icon('skull'));
  const title = h('span', { class: 'hud-obj-title' });
  const detail = h('span', { class: 'hud-obj-detail' });
  const markers = [];
  const mk = h('span', { class: 'hud-obj-markers' });
  for (let i = 0; i < 3; i++) { const m = { el: h('span', { class: 'hud-obj-marker', hidden: true }), ic: null, tx: h('span', {}) }; m.el.appendChild(m.tx); markers.push(m); mk.appendChild(m.el); }
  const pct = h('span', { class: 'hud-obj-pct', 'aria-hidden': 'true' });
  const el = h('div', { class: 'hud-objective hud-panel', 'data-hud': 'objective', role: 'status', 'aria-label': 'Objective' },
    h('span', { class: 'hud-obj-ring' }, ring, ico), h('div', { class: 'hud-obj-body' }, title, h('div', { class: 'hud-obj-sub' }, detail, mk)), pct);
  parent.appendChild(el);
  let lastState = '', lastKind = '', lastOff = -1;

  return {
    el,
    update(hud) {
      const o = hud.objective;
      const kind = o ? o.id : 'eliminate';
      let p;
      if (o && typeof o.progress === 'number') p = clamp(o.progress, 0, 1);
      else { const e = hud.teams && hud.teams[1]; p = e ? clamp(1 - (e.costStart > 0 ? e.cost / e.costStart : e.alive / (e.start || 1)), 0, 1) : 0; }
      const state = o && o.state ? o.state : 'active';
      setText(title, (o && o.text) || KIND_LABEL[kind] || 'Win the battle');
      setText(detail, (o && o.detail) || '');
      setHidden(detail, !(o && o.detail));
      const off = Math.round(C * (1 - p) * 4) / 4;
      if (off !== lastOff) { lastOff = off; prog.setAttribute('stroke-dashoffset', String(off)); }
      setText(pct, Math.round(p * 100) + '%');
      setAttr(el, 'aria-valuenow', Math.round(p * 100));
      if (kind !== lastKind) { lastKind = kind; ico.replaceChildren(icon(KIND_ICON[kind] || 'flag')); }
      setCls(el, 'is-won', state === 'won'); setCls(el, 'is-failed', state === 'failed'); setCls(el, 'is-muted', !o);
      if (state !== lastState) {
        if (lastState && (state === 'won' || state === 'failed')) anim(ctx, el, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 600, easing: 'cubic-bezier(.34,1.56,.64,1)' }, [{ opacity: 0.5 }, { opacity: 1 }]);
        lastState = state;
      }
      const ms = (o && o.markers) || [];
      for (let i = 0; i < markers.length; i++) {
        const m = markers[i], d = ms[i];
        setHidden(m.el, !d);
        if (d) {
          const nm = d.label || (d.type ? String(d.type).replace(/_/g, ' ') : 'marker');
          setText(m.tx, nm);
          if (m.kind !== d.type) { m.kind = d.type; if (m.ic) m.ic.remove(); m.ic = icon(MARKER_ICON[d.type] || 'diamond'); m.el.insertBefore(m.ic, m.tx); }
        }
      }
    },
    destroy() { el.remove(); },
  };
}
