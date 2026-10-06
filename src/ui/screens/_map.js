// _map.js: the stylised voxel Mediterranean for the campaign screen, as SVG built at runtime from a few coastline polygons.
// Polygons live in "map units" (0..160 x 0..100, x east, y south). Land is rasterised into 1.6-unit cubes (point-in-polygon on cell centres), shaded
// like little voxel blocks (lit top edge, dark cliff face under southern coasts, shallow-water rim), and merged into one <path> per colour.
import { svg } from '../hud/_dom.js';

export const MAP_W = 160, MAP_H = 100, CELL = 1.6;
const P = (...a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };

const LAND = [
  P(0, 0, 160, 0, 160, 17, 150, 15, 142, 19, 130, 16, 122, 19, 114, 15, 108, 19, 100, 15, 94, 19, 86, 24, 78, 19, 70, 22, 62, 26, 54, 24, 46, 26, 40, 30, 34, 24, 26, 22, 16, 24, 8, 26, 0, 28),          // northern Europe
  P(0, 26, 8, 24, 22, 22, 34, 26, 40, 32, 38, 42, 32, 50, 22, 56, 10, 56, 2, 50, 0, 44),                                                                                                          // Iberia
  P(58, 26, 66, 22, 76, 24, 82, 30, 86, 38, 94, 46, 102, 54, 100, 58, 94, 54, 88, 50, 80, 44, 74, 38, 66, 32, 60, 30),                                                                              // Italy
  P(88, 60, 98, 57, 100, 63, 92, 66),                                                                                                                                                              // Sicily
  P(62, 40, 68, 40, 68, 52, 62, 52), P(64, 32, 67, 32, 67, 38, 64, 38),                                                                                                                            // Sardinia, Corsica
  P(92, 22, 112, 20, 120, 26, 118, 34, 114, 40, 110, 46, 114, 54, 110, 64, 104, 66, 104, 58, 100, 50, 102, 42, 98, 34, 94, 28),                                                                     // Balkans + Greece
  P(100, 74, 122, 74, 124, 78, 102, 78), P(118, 50, 121, 50, 121, 53, 118, 53), P(122, 58, 125, 58, 125, 61, 122, 61), P(124, 44, 127, 44, 127, 47, 124, 47),                                      // Crete + islands
  P(118, 26, 134, 22, 150, 24, 160, 22, 160, 50, 152, 52, 142, 50, 132, 46, 124, 42, 120, 36),                                                                                                      // Anatolia
  P(146, 52, 160, 50, 160, 86, 152, 84, 150, 74, 147, 62),                                                                                                                                         // Levant
  P(0, 70, 14, 68, 28, 70, 42, 72, 56, 70, 62, 64, 68, 66, 74, 72, 88, 74, 100, 76, 112, 78, 126, 76, 136, 78, 146, 76, 150, 82, 160, 84, 160, 100, 0, 100),                                       // North Africa
];
// zones that recolour land: [polygon, kind]
const ZONES = [
  [P(58, 20, 88, 20, 88, 30, 58, 30), 'rock'],                    // Alps
  [P(104, 28, 110, 28, 110, 34, 104, 34), 'rock'],                // Olympus
  [P(120, 38, 142, 38, 142, 46, 120, 46), 'rock'],                // Taurus
  [P(8, 66, 40, 66, 40, 72, 8, 72), 'rock'],                      // Atlas
  [P(58, 2, 112, 2, 112, 14, 58, 14), 'forest'],                  // Germania
  [P(28, 8, 56, 8, 56, 22, 28, 22), 'forest'],                    // Gaul
  [P(0, 84, 160, 84, 160, 100, 0, 100), 'sand'],                  // Sahara
  [P(148, 58, 160, 58, 160, 88, 148, 88), 'sand'],                // Arabia
  [P(92, 74, 118, 74, 118, 80, 92, 80), 'sand'],                  // Cyrenaica coast
];
const NILE = [[128, 100], [128, 88], [129, 80], [128, 76]];

function inPoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const COLORS = { g1: '#7fbf4a', g2: '#74b343', g3: '#8ac84f', forest: '#4f9a3a', forest2: '#468f34', sand: '#e3c887', sand2: '#d8bc78', rock: '#9a9ca8', rock2: '#8a8c98', snow: '#f2f6fb', shore: '#efe0a0', cliff: '#4a7a30', cliffSand: '#b89a5c', cliffRock: '#6c6e7c', shallow: '#4f8bf0', river: '#5aa0ff' };

/** Rasterise the polygons -> { cols, rows, kind[] } where kind is '' (sea) or a land colour key. Exported for tests. */
export function raster() {
  const cols = Math.round(MAP_W / CELL), rows = Math.round(MAP_H / CELL);
  const kind = new Array(cols * rows).fill('');
  const river = new Set();
  for (let j = 0; j < NILE.length - 1; j++) {
    const [x0, y0] = NILE[j], [x1, y1] = NILE[j + 1];
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (CELL * 0.5));
    for (let s = 0; s <= steps; s++) { const t = s / steps; const cx = Math.floor((x0 + (x1 - x0) * t) / CELL), cy = Math.floor((y0 + (y1 - y0) * t) / CELL); river.add(cx + cy * cols); if (cy < 51) river.add(cx + 1 + cy * cols); }
  }
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const x = (cx + 0.5) * CELL, y = (cy + 0.5) * CELL;
    let land = false;
    for (const poly of LAND) if (inPoly(x, y, poly)) { land = true; break; }
    if (!land) continue;
    let k = 'g';
    for (const [poly, z] of ZONES) if (inPoly(x, y, poly)) k = z;
    const r = hash(cx, cy);
    if (k === 'g') k = r < 0.34 ? 'g1' : r < 0.67 ? 'g2' : 'g3';
    else if (k === 'forest') k = r < 0.5 ? 'forest' : 'forest2';
    else if (k === 'sand') k = r < 0.5 ? 'sand' : 'sand2';
    else if (k === 'rock') k = r < 0.12 ? 'snow' : r < 0.6 ? 'rock' : 'rock2';
    if (river.has(cx + cy * cols) && y > 77) k = 'river';
    kind[cx + cy * cols] = k;
  }
  return { cols, rows, kind };
}

const runsToPath = (cells, cols) => {
  // cells: sorted array of [cx, cy]; merge horizontal runs
  let d = '';
  let i = 0;
  while (i < cells.length) {
    const [x, y] = cells[i]; let j = i + 1;
    while (j < cells.length && cells[j][1] === y && cells[j][0] === cells[j - 1][0] + 1) j++;
    d += 'M' + (x * CELL).toFixed(2) + ' ' + (y * CELL).toFixed(2) + 'h' + ((j - i) * CELL).toFixed(2) + 'v' + CELL.toFixed(2) + 'h-' + ((j - i) * CELL).toFixed(2) + 'z';
    i = j;
  }
  return d;
};

/** Build the map SVG (sea, land cubes, clouds, boats). viewBox is set by the caller via setView(). */
export function buildMapSvg() {
  const { cols, rows, kind } = raster();
  const root = svg('svg', { viewBox: '0 0 ' + MAP_W + ' ' + MAP_H, class: 'map-svg', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true', focusable: 'false', 'shape-rendering': 'crispEdges' });
  const defs = svg('defs', null,
    svg('linearGradient', { id: 'map-sea', x1: 0, y1: 0, x2: 0, y2: 1 }, svg('stop', { offset: '0', 'stop-color': '#3f7be8' }), svg('stop', { offset: '1', 'stop-color': '#2956c4' })));
  root.appendChild(defs);
  root.appendChild(svg('rect', { x: -10, y: -10, width: MAP_W + 20, height: MAP_H + 20, fill: 'url(#map-sea)' }));
  // sparkles
  const spark = svg('g', { stroke: '#ffffff', 'stroke-opacity': 0.2, 'stroke-width': 0.5, 'stroke-linecap': 'butt' });
  for (let i = 0; i < 120; i++) { const x = hash(i, 5) * MAP_W, y = hash(i, 9) * MAP_H, w = 1.5 + hash(i, 3) * 2.5; spark.appendChild(svg('path', { d: 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'h' + w.toFixed(1) })); }
  root.appendChild(spark);

  const at = (cx, cy) => (cx < 0 || cy < 0 || cx >= cols || cy >= rows ? 'x' : kind[cx + cy * cols]);
  const groups = {}; const add = (key, cx, cy) => { (groups[key] || (groups[key] = [])).push([cx, cy]); };
  const shallow = [], cliff = {};
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const k = kind[cx + cy * cols];
    if (!k) { // sea cell: lighter if it touches land
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const q = at(cx + dx, cy + dy); if (q && q !== 'x') { near = true; break; } }
      if (near) shallow.push([cx, cy]);
      continue;
    }
    add(k, cx, cy);
    const below = at(cx, cy + 1);
    if (!below && cy + 1 < rows) { const ck = k.startsWith('sand') ? 'cliffSand' : k.startsWith('rock') || k === 'snow' ? 'cliffRock' : 'cliff'; (cliff[ck] || (cliff[ck] = [])).push([cx, cy]); }
  }
  const mk = (d, fill, opacity) => svg('path', { d, fill, opacity: opacity || null });
  root.appendChild(mk(runsToPath(shallow, cols), COLORS.shallow, 0.8));
  // cliff faces first (they sit under the lower neighbour's top face)
  const cg = svg('g');
  for (const ck of Object.keys(cliff)) { const d = cliff[ck].map(([x, y]) => 'M' + (x * CELL).toFixed(2) + ' ' + ((y + 1) * CELL).toFixed(2) + 'h' + CELL.toFixed(2) + 'v' + (CELL * 0.72).toFixed(2) + 'h-' + CELL.toFixed(2) + 'z').join(''); cg.appendChild(mk(d, COLORS[ck])); }
  root.appendChild(cg);
  const order = ['river', 'g1', 'g2', 'g3', 'forest', 'forest2', 'sand', 'sand2', 'rock', 'rock2', 'snow'];
  const land = svg('g');
  for (const key of order) if (groups[key]) land.appendChild(mk(runsToPath(groups[key], cols), COLORS[key]));
  root.appendChild(land);
  // lit north edges: a thin light band on cells whose north neighbour is sea
  const lit = [];
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) { if (kind[cx + cy * cols] && !at(cx, cy - 1) && cy > 0) lit.push([cx, cy]); }
  root.appendChild(svg('path', { d: lit.map(([x, y]) => 'M' + (x * CELL).toFixed(2) + ' ' + (y * CELL).toFixed(2) + 'h' + CELL.toFixed(2) + 'v' + (CELL * 0.28).toFixed(2) + 'h-' + CELL.toFixed(2) + 'z').join(''), fill: '#ffffff', opacity: 0.28 }));
  // tree dots on forests, pyramid triangles, a few stylised props
  const props = svg('g');
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const k = kind[cx + cy * cols];
    if ((k === 'forest' || k === 'forest2') && hash(cx, cy + 40) < 0.35) props.appendChild(svg('rect', { x: (cx * CELL + CELL * 0.2).toFixed(2), y: (cy * CELL - CELL * 0.5).toFixed(2), width: (CELL * 0.6).toFixed(2), height: (CELL * 0.9).toFixed(2), fill: '#2f7a28' }));
  }
  const pyr = (x, y, s) => svg('path', { d: 'M' + (x - s) + ' ' + y + 'L' + x + ' ' + (y - s * 1.1) + 'L' + (x + s) + ' ' + y + 'Z', fill: '#d9a441', stroke: '#14163a', 'stroke-width': 0.6, 'stroke-linejoin': 'round' });
  props.append(pyr(112, 92, 3.2), pyr(117, 93, 2.2), pyr(107, 93, 1.8));
  root.appendChild(props);
  return root;
}

/** Decorative drifting clouds + boats as HTML-free SVG groups; animated via CSS (transform only, stopped under Reduce Motion). */
export function buildMapDecor() {
  const g = svg('g', { class: 'map-decor' });
  const cloud = (x, y, s, dly) => { const c = svg('g', { class: 'map-cloud', style: '--d:' + dly + 's;--s:' + s, transform: 'translate(' + x + ' ' + y + ')' }, svg('rect', { x: 0, y: 0, width: 14, height: 3.2, fill: '#fff', opacity: 0.92 }), svg('rect', { x: 3, y: -2.4, width: 6, height: 3, fill: '#fff', opacity: 0.92 }), svg('rect', { x: 0.6, y: 3.2, width: 14, height: 1, fill: '#14163a', opacity: 0.16 })); return c; };
  g.append(cloud(18, 74, 1, -4), cloud(90, 90, 1.2, -18), cloud(52, 8, 0.9, -30));
  const boat = (x, y, flip, dly) => svg('g', { class: 'map-boat', style: '--d:' + dly + 's', transform: 'translate(' + x + ' ' + y + ') scale(' + (flip ? -0.65 : 0.65) + ' 0.65)' },
    svg('path', { d: 'M0 3 h9 l-1.5 2.4 h-6 z', fill: '#8a5a32', stroke: '#14163a', 'stroke-width': 0.6, 'stroke-linejoin': 'round' }), svg('rect', { x: 4.2, y: -4, width: 0.7, height: 7, fill: '#14163a' }), svg('path', { d: 'M5.2 -3.6 L9 -0.4 H5.2 Z', fill: '#f3f6fb', stroke: '#14163a', 'stroke-width': 0.5, 'stroke-linejoin': 'round' }));
  g.append(boat(80, 66, false, -3), boat(46, 62, true, -9), boat(138, 62, false, -14), boat(118, 8, true, -7));
  return g;
}

/** project(x,y,view) -> % position inside the stage for a map-unit coordinate. view = {x,y,w,h} */
export const project = (x, y, view) => [((x - view.x) / view.w) * 100, ((y - view.y) / view.h) * 100];
export const VIEWS = { wide: { x: 0, y: 6, w: 160, h: 90 }, tall: { x: 58, y: 2, w: 90, h: 90 } };
// pin positions in map units, keyed by mission index (0..8); (spec/world.md section 6 arenas on a stylised Mediterranean)
export const PINS = [[111, 52], [104, 42], [121, 83], [137, 77], [73, 23], [88, 9], [127, 35], [92, 62], [106, 31]];
