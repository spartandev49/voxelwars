// _portraits.js: the three announcers as chunky voxel-style SVG avatars (16x16 cubes, bevelled so every pixel reads as a little cube).
// avatar('brutus'|'plato'|'cassandra') -> <svg class="portrait"> with optional talking (mouth) and blinking (eyes) overlay layers.
import { svg } from './_dom.js';

export const PALETTE = {
  k: '#14163a', s: '#f0b48a', S: '#cf8c63', h: '#ffd6b0', c: '#e8806a', d: '#b5694a',
  r: '#e04545', R: '#9a2234', g: '#ffc93c', G: '#d9951a', y: '#fff0a8',
  w: '#f3f6fb', W: '#c9d1ea', x: '#8d96bd', X: '#5c648f',
  b: '#7a4e2c', B: '#3b2414', p: '#8a5cd6', P: '#4a2a8a', l: '#b99cf5', N: '#2a1745',
  e: '#ffffff', m: '#6e1a2a', t: '#fdf6e8', o: '#8bc34a', O: '#5c8f2a', n: '#2a2f6b', u: '#6ec6ff',
};

// Each face: base rows (mouth CLOSED, eyes OPEN) + `talk` rows (mouth open) + `blink` rows (eyes shut), all 16 chars wide. '.' is transparent.
//                   0123456789ABCDEF
const FACES = {
  brutus: {
    name: 'Brutus Maximus', role: 'Play-by-play', color: '#ee4b4b', pitch: 0.78,
    rows: [
      '.....rrrrrr.....',
      '...rrRrrrrRrr...',
      '..rrRrrRRrrRrr..',
      '..kggggggggggk..',
      '..kgGgyggyGggk..',
      '..kssssssssssk..',
      '..kBBBssssBBBk..',
      '..kseksssskesk..',
      '..ksssssSsssSk..',
      '..kcssssssssck..',
      '..ksSsmmmmsSsk..',
      '...kssssssssk...',
      '....kkssssskk...',
      '..rrRgggggggRrr.',
      '.rrRRgyggggyRRrr',
      '.rRRRGggggggRRRr',
    ],
    talk: { 10: '..kssmmmmmmssk..', 11: '...ksmttttmsk...', 12: '....kksmmmskk...' },
    blink: { 7: '..kskksssskksk..' },
  },
  plato: {
    name: 'Plato the Dry', role: 'Colour commentary', color: '#6ec6ff', pitch: 1.0,
    rows: [
      '................',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '..Wshhhhhhhhs.W.',
      '.WWsshhhhhhssWW.',
      '.WWssWWssWWssWW.',
      '.WWsskkssskkssW.',
      '..WssssssSssssW.',
      '..WsssssSSsssWW.',
      '..WWsssSSsssWW..',
      '.WWWWsskkkssWWWW',
      '.WWWWWWWWWWWWWW.',
      '..WWWWWWWWWWWW..',
      '..wwwWWWWWWwww..',
      '.wwwwoowwoowwww.',
      '.wwwwOowwoOwwww.',
    ],
    talk: { 10: '.WWWWsskkkssWWWW', 11: '.WWWWWkkkkkWWWW.', 12: '..WWWWWkkkWWWW..' },
    blink: { 5: '.WWssWWssWWssWW.', 6: '.WWskkkssskkksW.' },
  },
  cassandra: {
    name: 'Cassandra', role: 'Analyst', color: '#b99cf5', pitch: 1.3,
    rows: [
      '....NNNNNNNN....',
      '..NNNNNNNNNNNN..',
      '.NNNggyggggggNN.',
      '.NNNNNNNuNNNNNN.',
      '.NNssssssssssNN.',
      '.NNsssssssssssN.',
      '.NNskkessekksNN.',
      '.NNsdsssssssdsN.',
      '.NNssssSSsssssN.',
      '.NNssssssssssNN.',
      '.NNNssssmmsssNN.',
      '.NNNNsssssssNNN.',
      '..NNNNpssspNNN..',
      '..PPppppppppPP..',
      '.PPPpllpppllpPP.',
      'PPPPppppppppPPPP',
    ],
    talk: { 10: '.NNNsssmmmmssNN.', 11: '.NNNNssmmmsNNNN.' },
    blink: { 6: '.NNskkssskksssNN' },
  },
};

const NS = 16;
function runs(row, y, out) {
  let x = 0;
  while (x < row.length) {
    const ch = row[x];
    if (ch === '.' || ch === ' ') { x++; continue; }
    let e = x + 1;
    while (e < row.length && row[e] === ch) e++;
    out.push({ x, y, w: e - x, c: ch });
    x = e;
  }
}
function layer(rowsByY, cls) {
  const g = svg('g', { class: cls });
  const list = [];
  for (const y of Object.keys(rowsByY)) runs(rowsByY[y], +y, list);
  for (const r of list) g.appendChild(svg('rect', { x: r.x, y: r.y, width: r.w, height: 1, fill: PALETTE[r.c] || '#f0f' }));
  return g;
}

let uid = 0;
/** avatar('brutus') -> SVG element. `size` in CSS px (optional; otherwise sized by CSS). */
export function avatar(who, size) {
  const f = FACES[who] || FACES.brutus;
  const id = 'pt' + (uid++);
  const root = svg('svg', { viewBox: '0 0 ' + NS + ' ' + NS, class: 'portrait portrait-' + who, 'shape-rendering': 'crispEdges', role: 'img', 'aria-label': f.name, width: size || null, height: size || null });
  const defs = svg('defs', null, svg('pattern', { id, width: 1, height: 1, patternUnits: 'userSpaceOnUse' },
    svg('rect', { x: 0, y: 0, width: 1, height: 0.16, fill: 'rgba(255,255,255,.2)' }),
    svg('rect', { x: 0, y: 0.84, width: 1, height: 0.16, fill: 'rgba(10,10,40,.22)' }),
    svg('rect', { x: 0.86, y: 0, width: 0.14, height: 1, fill: 'rgba(10,10,40,.12)' })));
  root.appendChild(defs);
  const base = {};
  f.rows.forEach((r, y) => { base[y] = r; });
  root.appendChild(layer(base, 'pt-base'));
  if (f.talk) root.appendChild(layer(f.talk, 'pt-talk'));
  if (f.blink) root.appendChild(layer(f.blink, 'pt-blink'));
  root.appendChild(svg('rect', { x: 0, y: 0, width: NS, height: NS, fill: 'url(#' + id + ')', class: 'pt-bevel' }));
  return root;
}
export const ANNOUNCERS = { brutus: FACES.brutus, plato: FACES.plato, cassandra: FACES.cassandra };
export const PORTRAIT_DATA = FACES;
export const announcerInfo = (who) => FACES[who] || FACES.brutus;
