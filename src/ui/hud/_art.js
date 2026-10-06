// _art.js: small SVG illustrations for the battle screens (war horn, laurel wreath, white flag, shield crest) + a pooled confetti burst.
// All builders return detached SVG/DOM nodes; no innerHTML, no layout reads.
import { svg, h, mulberry } from './_dom.js';

const INK = '#14163a', GOLD = '#ffc93c', GOLD_D = '#d9951a', IVORY = '#f6ecd0', IVORY_D = '#d9c898', OLIVE = '#8bc34a', OLIVE_D = '#5f8f24', RED = '#ee4b4b';

/** A chunky war horn with three sound arcs. `.horn-waves` can be animated (opacity/transform). */
export function hornSvg() {
  const s = svg('svg', { viewBox: '0 0 150 90', class: 'art-horn', 'aria-hidden': 'true', focusable: 'false' });
  const waves = svg('g', { class: 'horn-waves', fill: 'none', stroke: GOLD, 'stroke-width': 5, 'stroke-linecap': 'round' });
  waves.append(svg('path', { d: 'M118 18 q10 10 0 22', class: 'w1' }), svg('path', { d: 'M126 10 q16 18 0 38', class: 'w2' }), svg('path', { d: 'M134 2 q22 26 0 54', class: 'w3' }));
  const body = svg('g', { class: 'horn-body' });
  body.append(
    svg('path', { d: 'M8 64 Q40 62 68 44 Q88 30 104 12 L120 34 Q98 52 76 64 Q46 82 12 78 Z', fill: IVORY, stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    svg('path', { d: 'M20 70 Q46 70 70 56 Q90 44 106 26', fill: 'none', stroke: IVORY_D, 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0.8 }),
    svg('path', { d: 'M100 8 L124 36', stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M96 12 L116 38 L124 34 L104 8 Z', fill: GOLD, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }),
    svg('path', { d: 'M6 62 L14 80 L24 78 L16 60 Z', fill: GOLD, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }),
    svg('path', { d: 'M52 56 L64 72', stroke: GOLD_D, 'stroke-width': 5, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M70 44 L80 58', stroke: GOLD_D, 'stroke-width': 5, 'stroke-linecap': 'round' }));
  s.append(waves, body);
  return s;
}

/** Laurel wreath ring (two mirrored branches). viewBox 0 0 200 200; the centre is empty for content. */
export function laurelSvg(opts) {
  const o = opts || {};
  const s = svg('svg', { viewBox: '0 0 200 200', class: 'art-laurel', 'aria-hidden': 'true', focusable: 'false' });
  const R = 76, rad = (d) => (d * Math.PI) / 180;
  const branch = (dir) => {
    const g = svg('g', { class: dir > 0 ? 'laurel-r' : 'laurel-l' });
    const a0 = 100, a1 = 258, n = 12;                              // degrees swept (screen space, y down), bottom -> upper side
    const phi = (t) => (dir > 0 ? 180 - (a0 + (a1 - a0) * t) : a0 + (a1 - a0) * t);   // the right branch mirrors the left across the vertical axis
    const pt = (t, off) => { const f = rad(phi(t)); return [100 + (R + off) * Math.cos(f), 100 + (R + off) * Math.sin(f)]; };
    const p0 = pt(0, 0), p1 = pt(1, 0);
    g.appendChild(svg('path', { d: 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + R + ' ' + R + ' 0 0 ' + (dir > 0 ? 0 : 1) + ' ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1), fill: 'none', stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }));
    g.appendChild(svg('path', { d: 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + R + ' ' + R + ' 0 0 ' + (dir > 0 ? 0 : 1) + ' ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1), fill: 'none', stroke: OLIVE_D, 'stroke-width': 3, 'stroke-linecap': 'round' }));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), sc = 1.12 - t * 0.38;
      const tang = (dir > 0 ? phi(t) - 90 : phi(t) + 90);              // direction of travel along the arc
      for (const side of [-1, 1]) {
        const [x, y] = pt(t, side * 3);
        const rot = tang + side * 38;
        g.appendChild(svg('path', { d: 'M0 0 C5 -8 19 -8 28 0 C19 8 5 8 0 0 Z', fill: (i + (side > 0 ? 1 : 0)) % 4 === 0 ? GOLD : OLIVE, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round', transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot.toFixed(1) + ') scale(' + sc.toFixed(2) + ')' }));
      }
    }
    return g;
  };
  s.append(branch(1), branch(-1));
  if (o.ribbon !== false) s.appendChild(svg('path', { d: 'M84 172 L100 160 L116 172 L112 196 L100 188 L88 196 Z', fill: RED, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }));
  return s;
}

/** A white flag of surrender on a bent pole (defeat banner art). */
export function flagSvg() {
  const s = svg('svg', { viewBox: '0 0 120 120', class: 'art-flag', 'aria-hidden': 'true', focusable: 'false' });
  s.append(
    svg('path', { d: 'M30 112 L36 14', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M30 112 L36 14', stroke: '#c9a36a', 'stroke-width': 4.5, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M38 18 Q62 8 82 20 T112 22 L106 62 Q84 52 62 64 T34 60 Z', fill: '#f3f6fb', stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
    svg('path', { d: 'M46 34 Q64 28 80 36', fill: 'none', stroke: '#c9d1ea', 'stroke-width': 4, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M44 46 Q64 42 84 50', fill: 'none', stroke: '#c9d1ea', 'stroke-width': 4, 'stroke-linecap': 'round' }),
    svg('circle', { cx: 36, cy: 12, r: 7, fill: GOLD, stroke: INK, 'stroke-width': 4 }));
  return s;
}

/** Draw / handshake-free shield crest used for draws. */
export function crestSvg() {
  const s = svg('svg', { viewBox: '0 0 120 120', class: 'art-crest', 'aria-hidden': 'true', focusable: 'false' });
  s.append(
    svg('path', { d: 'M60 8 L106 24 V58 C106 84 86 104 60 114 C34 104 14 84 14 58 V24 Z', fill: '#2a2f6b', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }),
    svg('path', { d: 'M60 8 V114', stroke: INK, 'stroke-width': 5 }),
    svg('path', { d: 'M14 52 H106', stroke: INK, 'stroke-width': 5 }),
    svg('path', { d: 'M60 8 L106 24 V52 H60 Z', fill: '#3b6cf0' }),
    svg('path', { d: 'M60 52 H14 V24 L60 8 Z', fill: '#ee4b4b' }),
    svg('path', { d: 'M60 52 H106 V58 C106 84 86 104 60 114 Z', fill: '#ee4b4b' }),
    svg('path', { d: 'M60 52 H14 V58 C14 84 34 104 60 114 Z', fill: '#3b6cf0' }),
    svg('path', { d: 'M60 8 L106 24 V58 C106 84 86 104 60 114 C34 104 14 84 14 58 V24 Z', fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' }),
    svg('path', { d: 'M60 8 V114 M14 52 H106', stroke: INK, 'stroke-width': 5 }));
  return s;
}

const CONFETTI = ['#ffc93c', '#ee4b4b', '#6ec6ff', '#8bc34a', '#ff7eb6', '#ff7a2f', '#f3f6fb'];
/** Falling confetti / ash. Pieces use CSS animation on transform + opacity only (see .bs-confetti in hud.css). Returns the container. */
export function confetti(n, kind, seed) {
  const r = mulberry(seed || 7);
  const box = h('div', { class: 'bs-confetti is-' + (kind || 'party'), 'aria-hidden': 'true' });
  for (let i = 0; i < n; i++) {
    const p = h('i', { style: { '--x': (r() * 100).toFixed(1) + '%', '--d': (r() * 4).toFixed(2) + 's', '--t': (3.2 + r() * 2.6).toFixed(2) + 's', '--r': Math.round(r() * 720 - 360) + 'deg', '--s': (0.7 + r() * 0.9).toFixed(2), '--sway': Math.round(r() * 60 - 30) + 'px', '--c': kind === 'ash' ? (r() < 0.5 ? '#8d96bd' : '#5c648f') : CONFETTI[i % CONFETTI.length] } });
    box.appendChild(p);
  }
  return box;
}
