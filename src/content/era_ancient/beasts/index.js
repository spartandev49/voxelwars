import { buildHorse } from './quad1.js';
export const SHEET_MODELS = [
  { id: 'horse_chestnut', group: 'beast', label: 'Horse chestnut', make: () => buildHorse({ coat: 'chestnut', blaze: true, socks: ['FL', 'BR'] }) },
  { id: 'horse_white', group: 'beast', label: 'Horse white', make: () => buildHorse({ coat: 'white' }) },
];
