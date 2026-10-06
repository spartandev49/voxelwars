// killfeed.js: last 5 kills with funny verbs. Pooled rows, newest at the bottom, rows fade after ~9 s of battle time.
// hud.killfeed = [{ t, text, team, verb?, cause?, killer?, victim?, key? }]   (newest last)
// Verb source: item.verb, else ctx.content.humor.killVerbs[cause] (array, picked deterministically from the item), else a plain default.
import { h, setText, setCls, setHidden, anim, hash32 } from './_dom.js';

export const meta = { id: 'killfeed', slot: 'top-right', order: 3 };
const ROWS = 5, LIFE = 9;
const DEFAULT_VERBS = ['bonked', 'perforated', 'yeeted', 'philosophised at', 'mildly inconvenienced'];

export function verbFor(ctx, item) {
  if (item.verb) return item.verb;
  const kv = ctx && ctx.content && ctx.content.humor && ctx.content.humor.killVerbs;
  let list = null;
  if (kv) list = Array.isArray(kv) ? kv : (kv[item.cause] || kv.default || kv.any || null);
  if (!list || !list.length) list = DEFAULT_VERBS;
  return list[hash32(String(item.key || item.t) + (item.killer || '') + (item.victim || '')) % list.length];
}
const keyOf = (it) => it.key != null ? String(it.key) : it.t + '|' + (it.text || (it.killer + '>' + it.victim));

export function mount(parent, ctx) {
  const rows = [];
  const el = h('div', { class: 'hud-feed', 'data-hud': 'killfeed', role: 'log', 'aria-label': 'Kill feed', 'aria-live': 'off' });
  for (let i = 0; i < ROWS; i++) {
    const r = { el: h('div', { class: 'hud-feed-row', hidden: true }), pip: h('i', { class: 'hud-pip' }), a: h('span', { class: 'f-pre' }), v: h('b', { class: 'f-verb' }), b: h('span', { class: 'f-post' }), item: null };
    r.el.append(r.pip, r.a, r.v, r.b);
    el.appendChild(r.el); rows.push(r);
  }
  parent.appendChild(el);
  const recent = [];          // {key, t, pre, verb, post, team}
  const seen = new Set();
  let lastClear = 0;

  function compose(it) {
    const verb = verbFor(ctx, it);
    if (it.killer != null && it.victim != null) return { pre: it.killer + ' ', verb, post: ' ' + it.victim };
    const text = String(it.text || '');
    if (it.verb && text.includes(it.verb)) { const i = text.indexOf(it.verb); return { pre: text.slice(0, i), verb: it.verb, post: text.slice(i + it.verb.length) }; }
    return { pre: text, verb: '', post: '' };
  }

  return {
    el,
    update(hud) {
      const feed = hud.killfeed || [];
      const now = hud.time || 0;
      if (now + 1 < lastClear) { recent.length = 0; seen.clear(); }       // rematch / new battle: time went backwards
      lastClear = now;
      for (let i = 0; i < feed.length; i++) {
        const it = feed[i], k = keyOf(it);
        if (seen.has(k)) continue;
        seen.add(k); if (seen.size > 80) seen.delete(seen.values().next().value);
        const c = compose(it);
        recent.push({ key: k, t: it.t != null ? it.t : now, team: it.team, pre: c.pre, verb: c.verb, post: c.post });
        if (recent.length > ROWS) recent.shift();
      }
      // paint: slot i shows recent[recent.length - ROWS + i]
      const off = recent.length - ROWS;
      for (let i = 0; i < ROWS; i++) {
        const r = rows[i], e = recent[off + i];
        const alive = e && now - e.t < LIFE;
        setHidden(r.el, !alive);
        if (!alive) { r.k = null; continue; }
        setText(r.a, e.pre); setText(r.v, e.verb); setText(r.b, e.post);
        setCls(r.pip, 'is-a', e.team === 0); setCls(r.pip, 'is-b', e.team === 1);
        setCls(r.el, 'is-old', now - e.t > LIFE - 3);
        if (r.k !== e.key) {
          r.k = e.key;
          anim(ctx, r.el, [{ transform: 'translateX(18px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' }, [{ opacity: 0 }, { opacity: 1 }]);
        }
      }
    },
    destroy() { el.remove(); },
  };
}
