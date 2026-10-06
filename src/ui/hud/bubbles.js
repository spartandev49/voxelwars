// bubbles.js: the in-world DOM label layer. Speech bubbles (pool of 12 `.vw-bubble`) and floating combat tags (BLOCKED! / CRIT! / BRACE! ...).
// Positions are CSS pixels inside the HUD root (the renderer projects world -> screen). Two ways in:
//  - data: hud.worldLabels = { bubbles:[{id,text,x,y,kind?,a?}], tags:[{id,kind|text,x,y}] }   (pulled <= 10 Hz; transforms glide via a 100 ms linear transition)
//  - imperative: api.bubble(id,text,x,y,kind,ttl) / api.move(id,x,y) / api.tag(id,kind,x,y), cheap enough to call every frame (transform only).
import { h, setText, anim, disposer } from './_dom.js';

export const meta = { id: 'bubbles', slot: 'world', order: 1 };
const NB = 12, NT = 16;
export const TAG_TEXT = { blocked: 'BLOCKED!', crit: 'CRIT!', brace: 'BRACE!', backstab: 'BACKSTAB!', miss: 'MISS!', charge: 'CHARGE!', stone: 'STONE COLD!', heal: 'AHH, NICE', rout: 'RUN!' };
const KINDS = ['bark', 'death', 'hero', 'zzz', 'thought'];
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function mount(parent, ctx) {
  const d = disposer();
  const layer = h('div', { class: 'vw-bubbles', 'data-hud': 'bubbles', 'aria-hidden': 'true' });
  parent.appendChild(layer);
  const bubbles = [], tags = [], byId = new Map();
  for (let i = 0; i < NB; i++) {
    const t = h('span', { class: 'vw-bubble-t' });
    const el = h('div', { class: 'vw-bubble', hidden: true }, t, h('i', { class: 'vw-bubble-tail' }));
    layer.appendChild(el);
    bubbles.push({ el, t, id: null, used: false, born: 0, until: 0, x: NaN, y: NaN, kind: '', fresh: false, seen: -1 });
  }
  for (let i = 0; i < NT; i++) { const el = h('div', { class: 'vw-tag', hidden: true }); layer.appendChild(el); tags.push({ el, busy: false }); }
  let frame = 0;
  const xf = (x, y) => 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) translate(-50%,-100%)';

  function release(s) { byId.delete(s.id); s.used = false; s.id = null; s.el.hidden = true; s.kind = ''; }

  function bubble(id, text, x, y, kind, ttl) {
    let s = byId.get(id);
    if (!s) {
      s = bubbles.find((b) => !b.used);
      if (!s) {                                  // pool exhausted: steal the oldest that is not a hero line
        s = bubbles.reduce((o, b) => (b.kind !== 'hero' && b.born < o.born ? b : o), bubbles[0]);
        release(s);
      }
      s.used = true; s.id = id; byId.set(id, s); s.born = now(); s.fresh = true; s.x = s.y = NaN; s.kind = '';
      s.el.hidden = false;
      anim(ctx, s.t, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 200, easing: 'ease-out' }, [{ opacity: 0 }, { opacity: 1 }]);
    } else if (s.fresh && s.seen !== frame) s.fresh = false;     // second sighting: allow the glide transition
    const k = KINDS.includes(kind) ? kind : 'bark';
    s.el.className = 'vw-bubble is-' + k + (s.fresh ? ' no-tx' : '');
    s.kind = k;
    setText(s.t, text);
    const rx = Math.round(x), ry = Math.round(y);
    if (s.x !== rx || s.y !== ry) { s.x = rx; s.y = ry; s.el.style.transform = xf(rx, ry); }
    s.seen = frame;
    s.until = ttl ? now() + ttl * 1000 : 0;
    return s;
  }

  function tag(id, kind, x, y, text) {
    if (tags.some((t) => t.busy && t.id === id)) return;
    const s = tags.find((t) => !t.busy); if (!s) return;
    s.busy = true; s.id = id;
    const k = TAG_TEXT[kind] ? kind : 'blocked';
    s.el.className = 'vw-tag is-' + k;
    s.el.textContent = text || TAG_TEXT[k];
    s.el.hidden = false;
    s.el.style.transform = xf(x, y);
    const done = () => { s.busy = false; s.el.hidden = true; };
    const a = anim(ctx, s.el,
      [{ opacity: 0, translate: '0 6px', scale: '.6' }, { opacity: 1, translate: '0 -6px', scale: '1.15', offset: 0.18 }, { opacity: 1, translate: '0 -18px', scale: '1', offset: 0.7 }, { opacity: 0, translate: '0 -30px', scale: '1' }],
      { duration: 950, easing: 'ease-out', fill: 'forwards' },
      [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }]);
    if (a) a.onfinish = done; else setTimeout(done, 900);
  }

  d.interval(() => { const t = now(); for (const s of bubbles) if (s.used && s.until && t > s.until) release(s); }, 250);

  return {
    el: layer,
    bubble, tag,
    move(id, x, y) { const s = byId.get(id); if (s) { s.x = Math.round(x); s.y = Math.round(y); s.el.style.transform = xf(x, y); } },
    release: (id) => { const s = byId.get(id); if (s) release(s); },
    clear() { bubbles.forEach((s) => s.used && release(s)); },
    count() { let n = 0; for (const b of bubbles) if (b.used) n++; return n; },
    update(hud) {
      frame++;
      const wl = hud.worldLabels;
      if (!wl) return;
      if (wl.bubbles) {
        for (const b of wl.bubbles) { const s = bubble(b.id, b.text, b.x, b.y, b.kind, 0); const o = b.a == null ? '' : String(b.a); if (s.o !== o) { s.o = o; s.el.style.opacity = o; } }
        for (const s of bubbles) if (s.used && s.seen !== frame && !s.until) release(s);      // data-driven bubbles vanish when the data drops them
      }
      if (wl.tags) for (const t of wl.tags) tag(t.id, t.kind, t.x, t.y, t.text);
    },
    destroy() { d.run(); layer.remove(); },
  };
}
