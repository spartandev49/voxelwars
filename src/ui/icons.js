// VOXELWARS UI icons: chunky 24x24 stroke icons as SVG path data (no markup strings, built with createElementNS).
// Usage: import { icon, ICON_NAMES } from './icons.js'; el.append(icon('sword', { class: 'x' }));
// Names are stable; unknown names fall back to 'cube'. Entries: array of path `d` strings, or { d: [...], fill: true }.

const SVGNS = 'http://www.w3.org/2000/svg';
const dot = (x, y, r = 1.4) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

export const ICONS = {
  play: { d: ['M7 4.5l13 7.5-13 7.5z'], fill: true },
  pause: ['M8 5v14', 'M16 5v14'],
  fast: { d: ['M4 6l7 6-7 6z', 'M12 6l7 6-7 6z'], fill: true },
  sword: ['M14.5 17.5L3 6V3h3l11.5 11.5', 'M13 19l6-6', 'M16 16l4 4', 'M19 21l2-2'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'],
  flag: ['M5 21V4', 'M5 4h13l-2.5 4 2.5 4H5'],
  map: ['M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z', 'M9 4v14', 'M15 6v14'],
  skull: ['M12 3a8 8 0 0 0-8 8c0 3 1.5 4.5 3 5.5V20h10v-3.5c1.5-1 3-2.5 3-5.5a8 8 0 0 0-8-8z', dot(9, 11.5, 1.2), dot(15, 11.5, 1.2), 'M10.5 20v-2.5M13.5 20v-2.5'],
  gear: ['M12 2.8l1.7 2.6 3-.6.9 2.9 2.8 1.3-1 2.9 1 2.9-2.8 1.3-.9 2.9-3-.6L12 21.2l-1.7-2.6-3 .6-.9-2.9-2.8-1.3 1-2.9-1-2.9 2.8-1.3.9-2.9 3 .6z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  trophy: ['M8 4h8v6a4 4 0 0 1-8 0z', 'M8 6H4v2a4 4 0 0 0 4 4', 'M16 6h4v2a4 4 0 0 1-4 4', 'M12 14v4', 'M8 21h8'],
  book: ['M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z', 'M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z'],
  hammer: ['M13 3l8 8-3 3-8-8z', 'M12 8L3.5 16.5a2.1 2.1 0 0 0 3 3L15 11'],
  brush: ['M20 4c-5 1-9 5-10 9l3 3c4-1 8-5 7-12z', 'M9.5 14C7 14 5 16 5 19c3 0 5-2 5-4.5'],
  users: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6', 'M16.5 4.5a3.2 3.2 0 0 1 0 6.2', 'M18 14.2c2.2.6 3.5 2.6 3.5 5.8'],
  star: { d: ['M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 3 1.1-6.2L3 9.7l6.2-.9z'], fill: true },
  starline: ['M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 3 1.1-6.2L3 9.7l6.2-.9z'],
  lock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  check: ['M4 12.5l5 5L20 6.5'],
  x: ['M5 5l14 14', 'M19 5L5 19'],
  back: ['M20 12H5', 'M11 5l-7 7 7 7'],
  forward: ['M4 12h15', 'M13 5l7 7-7 7'],
  chevL: ['M15 5l-7 7 7 7'],
  chevR: ['M9 5l7 7-7 7'],
  chevD: ['M5 9l7 7 7-7'],
  chevU: ['M5 15l7-7 7 7'],
  search: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M16 16l5 5'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  undo: ['M9 14L4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-4'],
  redo: ['M15 14l5-5-5-5', 'M20 9H10a6 6 0 0 0 0 12h4'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 14h10l1-14', 'M10 11v6', 'M14 11v6'],
  save: ['M5 4h12l3 3v13H5z', 'M8 4v5h7V4', 'M8 20v-6h8v6'],
  folder: ['M3 6h6l2 2h10v11H3z'],
  download: ['M12 4v11', 'M7 11l5 5 5-5', 'M5 20h14'],
  upload: ['M12 16V5', 'M7 9l5-5 5 5', 'M5 20h14'],
  copy: ['M9 9h11v11H9z', 'M5 15V4h11'],
  volume: ['M4 9h4l5-4v14l-5-4H4z', 'M16.5 8.5a5 5 0 0 1 0 7', 'M19 6a8.5 8.5 0 0 1 0 12'],
  mute: ['M4 9h4l5-4v14l-5-4H4z', 'M17 9l5 6', 'M22 9l-5 6'],
  music: ['M9 18V5l11-2v13', 'M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 'M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 11v6', 'M12 7.5h.01'],
  help: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7', 'M12 16.8h.01'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  dice: ['M4 4h16v16H4z', 'M8.5 8.5h.01', 'M15.5 8.5h.01', 'M12 12h.01', 'M8.5 15.5h.01', 'M15.5 15.5h.01'],
  fire: ['M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.5 1 2 2 2-.5-3 0-6 1-8z'],
  bolt: { d: ['M13 3L5 14h6l-1 7 8-11h-6z'], fill: true },
  heart: ['M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z'],
  coin: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v10', 'M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4'],
  clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2'],
  scroll: ['M6 4h12v13a3 3 0 0 0 3 3H9a3 3 0 0 1-3-3z', 'M9 8h6', 'M9 12h6'],
  wine: ['M7 3h10l-1 7a4 4 0 0 1-8 0z', 'M12 14v6', 'M8 21h8'],
  goat: ['M7 4c-3 0-4 3-3 5', 'M17 4c3 0 4 3 3 5', 'M8 8h8l1 5-2 6h-6l-2-6z', dot(10, 12, .5), dot(14, 12, .5)],
  chicken: ['M16 5a3 3 0 0 0-3 3v2H8a4 4 0 0 0-4 4 6 6 0 0 0 6 6h4a5 5 0 0 0 5-5V8a3 3 0 0 0-3-3z', dot(16, 8.2, .5), 'M19 8l2 1-2 1'],
  laurel: ['M12 20c-5 0-8-4-8-9', 'M12 20c5 0 8-4 8-9', 'M5 13l-2-2', 'M7 9L5 6', 'M10 6L9 3', 'M19 13l2-2', 'M17 9l2-3', 'M14 6l1-3'],
  pin: ['M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z', 'M12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z'],
  crosshair: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 2v5', 'M12 17v5', 'M2 12h5', 'M17 12h5'],
  eraser: ['M3 17l9-10 8 8-5 5H8z', 'M8 12l7 7'],
  pointer: ['M5 3l14 8-6 2 3 7-3 1-3-7-5 4z'],
  line: ['M5 19L19 5', 'M3.5 17.5h3v3h-3z', 'M17.5 3.5h3v3h-3z'],
  block: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  scatter: [dot(6, 6), dot(14, 5), dot(19, 10), dot(9, 12), dot(16, 16), dot(5, 18), dot(12, 20)],
  mirror: ['M12 3v18', 'M8 7l-5 5 5 5z', 'M16 7l5 5-5 5z'],
  wand: ['M5 19L16 8', 'M15 3.5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z', 'M19 14l.7 1.3 1.3.7-1.3.7L19 18l-.7-1.3-1.3-.7 1.3-.7z'],
  refresh: ['M20 11a8 8 0 1 0-2.3 6', 'M20 4v7h-7'],
  home: ['M3 11l9-8 9 8', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  warning: ['M12 3l10 18H2z', 'M12 10v5', 'M12 18h.01'],
  bug: ['M8 8h8v8a4 4 0 0 1-8 0z', 'M12 8v12', 'M4 12h4', 'M16 12h4', 'M5 6l3 3', 'M19 6l-3 3', 'M5 19l3-3', 'M19 19l-3-3'],
  keyboard: ['M3 6h18v12H3z', 'M7 10h.01', 'M11 10h.01', 'M15 10h.01', 'M7 14h10'],
  palette: ['M12 3a9 9 0 0 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.2-2.5 1.5-2.5H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z', dot(8, 11, 1), dot(12, 7.5, 1), dot(16.5, 10, 1)],
  sun: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M12 2v2', 'M12 20v2', 'M2 12h2', 'M20 12h2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  cloud: ['M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5 4.8 4.8 0 0 1 17 18z'],
  rain: ['M7 14a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 4.5 4.8 4.8 0 0 1 17 14z', 'M8 17l-1 3', 'M12 17l-1 3', 'M16 17l-1 3'],
  storm: ['M7 13a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 3.5 4.8 4.8 0 0 1 17 13z', 'M12 13l-2.5 4h3.5l-2.5 4'],
  snow: ['M12 3v18', 'M4.2 7.5l15.6 9', 'M4.2 16.5l15.6-9'],
  wind: ['M3 8h11a3 3 0 1 0-3-3', 'M3 12h16a3 3 0 1 1-3 3', 'M3 16h8'],
  fog: ['M4 8h16', 'M2 12h16', 'M6 16h16'],
  bow: ['M6 4c6 3 6 13 0 16', 'M6 4v16', 'M6 12h14', 'M17 9l3 3-3 3'],
  horseshoe: ['M6 20V10a6 6 0 0 1 12 0v10', 'M6 20h3', 'M15 20h3'],
  tower: ['M6 21V8h12v13z', 'M6 8V4h3v2h2V4h2v2h2V4h3v4', 'M10 21v-5h4v5'],
  crown: ['M3 8l4.5 5L12 5l4.5 8L21 8l-2 11H5z'],
  paw: ['M12 13.5c-3 0-5 2-5 4 0 1.5 1.5 2.5 3 2.5h4c1.5 0 3-1 3-2.5 0-2-2-4-5-4z', dot(6, 10, 1.6), dot(10, 6.5, 1.6), dot(14, 6.5, 1.6), dot(18, 10, 1.6)],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v6H4V6h6'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  target: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M12 12h.01'],
  medal: ['M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12z', 'M8 14l-2 7 6-3 6 3-2-7'],
  tent: ['M3 20L12 4l9 16z', 'M12 20v-6'],
  monitor: ['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  shuffle: ['M3 7h4l10 10h4', 'M3 17h4l3-3', 'M14 10l3-3h4', 'M18 4l3 3-3 3', 'M18 14l3 3-3 3'],
  door: ['M9 4H5v16h4', 'M14 8l5 4-5 4', 'M19 12H9'],
  cube: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M12 12l8-4.5', 'M12 12v9', 'M12 12L4 7.5'],
  link: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  hand: ['M8 12V5a1.5 1.5 0 0 1 3 0v6', 'M11 11V3.5a1.5 1.5 0 0 1 3 0V11', 'M14 11V5a1.5 1.5 0 0 1 3 0v8', 'M8 12l-1.5-2a1.5 1.5 0 0 0-2.3 1.9L8 18a5 5 0 0 0 4 2h2a5 5 0 0 0 5-5v-3'],
  flask: ['M9 3h6', 'M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3', 'M7.5 15h9'],
  sparkle: { d: ['M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z'], fill: true },
  gamepad: ['M7 7h10a5 5 0 0 1 5 5v1a3 3 0 0 1-5.3 2L15 14H9l-1.7 1A3 3 0 0 1 2 13v-1a5 5 0 0 1 5-5z', 'M7.5 10v4', 'M5.5 12h4', dot(15.5, 11, .6), dot(17.5, 13, .6)],
  accessibility: ['M12 5a1.8 1.8 0 1 0 0 .01', 'M4 8.5c5 1.5 11 1.5 16 0', 'M12 9v5', 'M9 21l3-7 3 7'],
  image: ['M3 5h18v14H3z', 'M3 16l5-5 4 4 3-3 6 6', dot(8, 9.5, 1.3)],
  database: ['M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z', 'M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6', 'M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6'],
  // achievement glyphs (HUMOR icon ids)
  boot: ['M8 3h6v7.5l6 3V19H5.5v-4.5L8 13z', 'M5.5 19h14.5', 'M8 7h6'],
  dagger: ['M12 2l2.4 10.5h-4.8z', 'M7 12.5h10', 'M12 12.5V19', dot(12, 21, 1.1)],
  elephant: ['M12 7c-3 0-5.5 2-5.5 5v3', 'M12 7c3 0 5.5 2 5.5 5', 'M5 8.5a3.2 3.2 0 1 0 0 6.4', 'M19 8.5a3.2 3.2 0 1 1 0 6.4', 'M10.5 12.5v6.5c0 1.5 3 1.5 3 0v-2', dot(10, 11, .9), dot(14, 11, .9)],
  phoenix: ['M12 21c-3.2-3-3.2-6.2 0-9.5 3.2 3.3 3.2 6.5 0 9.5z', 'M12 12.5C9.5 12 6 9.5 3 4c4.5 0 7.5 1.4 9 4.5', 'M12 12.5c2.5-.5 6-3 9-8.5-4.5 0-7.5 1.4-9 4.5'],
  gift: ['M4 10h16v10H4z', 'M3 7h18v3H3z', 'M12 7v13', 'M12 7C10.5 3.5 6.5 3.8 7.5 6.5 8 7 10 7 12 7z', 'M12 7c1.5-3.5 5.5-3.2 4.5-.5-.5.5-2.5.5-4.5.5z'],
  statue: ['M12 7.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.200z', 'M8.5 21V11.500L12 9.500l3.5 2V21', 'M6.5 21h11', 'M8.5 14.500H5.5', 'M15.5 14.500h3'],
  meteor: ['M19.5 8.500a4.2 4.2 0 1 1-8.4 0 4.2 4.2 0 0 1 8.4 0z', 'M11.5 11L3 20', 'M9.5 7.500L4 13', 'M16 13.500L10.5 19'],
  phalanx: ['M3 9h5.200v5.200L5.6 16.5 3 14.200z', 'M9.4 9h5.200v5.200L12 16.5 9.4 14.200z', 'M15.8 9H21v5.200l-2.6 2.3-2.6-2.300z', 'M5.6 3v6', 'M12 3v6', 'M18.4 3v6', 'M3 20h18'],
  coins: ['M5 6.500c0-1.4 3.1-2.5 7-2.500s7 1.1 7 2.5-3.1 2.5-7 2.5-7-1.1-7-2.500z', 'M5 6.500v3.800c0 1.4 3.1 2.5 7 2.500s7-1.1 7-2.500V6.5', 'M5 10.300v3.800c0 1.4 3.1 2.5 7 2.500s7-1.1 7-2.500v-3.8', 'M5 14.100v3.400C5 18.9 8.1 20 12 20s7-1.1 7-2.500v-3.4'],
  shovel: ['M14.5 9.500L4.5 19.5', 'M12.5 6l5.5 5.5-3 3L9.5 9z', 'M16.5 4l3.5 3.5', 'M18.5 2.500L21.5 5.5'],
  anvil: ['M3 7h13.500c2.8 0 4.5 1.1 4.5 3h-6l-1 3H9.500l-1-3H3z', 'M9.5 13v4.500H7V21h10v-3.500h-2.500V13'],
  column: ['M5 4h14', 'M7 4v2.500h10V4', 'M9 6.500v11', 'M12 6.500v11', 'M15 6.500v11', 'M7 17.500h10V20H7z', 'M5 20h14'],
};

/** HUMOR ids that map onto an existing glyph (screens may pass either name). */
export const ICON_ALIAS = { lightning: 'bolt', storm_cloud: 'storm', drumstick: 'chicken', trophy_gold: 'trophy' };
export const ICON_NAMES = Object.keys(ICONS);

/** Build an <svg class="vw-icon"> for `name`. opts: { class, size (css), title }. Decorative by default (aria-hidden). */
export function icon(name, opts) {
  const def = ICONS[name] || ICONS[ICON_ALIAS[name]] || ICONS.cube;
  const paths = Array.isArray(def) ? def : def.d;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'vw-icon' + (opts && opts.class ? ' ' + opts.class : '') + (!Array.isArray(def) && def.fill ? ' vw-icon--fillshape' : ''));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (!Array.isArray(def) && def.fill) svg.style.fill = 'currentColor';
  if (opts && opts.size) { svg.style.width = opts.size; svg.style.height = opts.size; }
  for (const d of paths) {
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
  }
  return svg;
}
