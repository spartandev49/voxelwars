// Arena Builder icons: the tool glyphs that the UI kit set (ui/icons.js) does not have, drawn in the same 24 x 24 stroke style, plus a
// helper that falls back to the kit icons for everything else. Decorative (aria-hidden); buttons carry their own aria-labels.
import { icon as kitIcon } from '../../ui/icons.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const D = {
  raise: ['M2 20l6-10 4 6 3-4 7 8z', 'M12 3v5', 'M9.5 5.5L12 3l2.5 2.5'],
  smooth: ['M2 13c3-6 6-6 10 0s7 6 10 0', 'M2 19h20'],
  flatten: ['M3 12h18', 'M8 5l4 4 4-4', 'M8 19l4-4 4 4'],
  water: ['M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z'],
  noise: ['M2 16l3-5 3 4 3-8 3 9 3-4 4 3'],
  ramp: ['M3 19h18V8z', 'M8 19v-2', 'M13 19v-4'],
  stamp: ['M9 3h6v6l3 4v3H6v-3l3-4z', 'M5 20h14'],
  props: ['M12 3l6 9h-3l4 6H5l4-6H6z', 'M12 18v3'],
  zones: ['M3 5h11v14H3z', 'M10 9h11v10H10z'],
  target: ['M12 12h.01', 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M12 3v3', 'M12 18v3', 'M3 12h3', 'M18 12h3'],
  touch: ['M9 11V5a2 2 0 0 1 4 0v6', 'M13 11a2 2 0 0 1 4 0v3a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2l-2-3a2 2 0 0 1 3-2l1 1V8'],
  rotate: ['M20 12a8 8 0 1 1-3-6.2', 'M20 4v5h-5'],
  scale: ['M4 20l16-16', 'M4 14v6h6', 'M20 10V4h-6'],
  top: ['M3 5h18v14H3z', 'M3 12h18', 'M12 5v14'],
  layers: ['M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5'],
  lock: ['M6 11h12v9H6z', 'M8 11V8a4 4 0 0 1 8 0v3'],
};
const KIT_MAP = { paint: 'brush', hazards: 'warning', symmetry: 'mirror', generate: 'dice', environment: 'sun', info: 'info', markers: 'flag' };

export function eicon(name, o) {
  const d = D[name];
  if (!d) return kitIcon(KIT_MAP[name] || name, o);
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'vw-icon' + (o && o.class ? ' ' + o.class : '')); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  if (o && o.size) { svg.style.width = o.size; svg.style.height = o.size; }
  for (const p of d) { const e = document.createElementNS(SVGNS, 'path'); e.setAttribute('d', p); svg.appendChild(e); }
  return svg;
}
