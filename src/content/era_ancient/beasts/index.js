import { buildHorse, buildCamel, buildHound, buildGoat } from './quad1.js';
export const SHEET_MODELS = [
  { id: 'horse_chestnut', group: 'beast', label: 'Horse chestnut', make: () => buildHorse({ coat: 'chestnut', blaze: true, socks: ['FL', 'BR'] }) },
  { id: 'horse_white', group: 'beast', label: 'Horse white', make: () => buildHorse({ coat: 'white' }) },
  { id: 'horse_barded', group: 'beast', label: 'Horse barded', make: () => buildHorse({ coat: 'black', barded: true }) },
  { id: 'camel', group: 'beast', label: 'Camel', make: () => buildCamel({}) },
  { id: 'hound', group: 'beast', label: 'Warhound', make: () => buildHound({}) },
  { id: 'goat', group: 'beast', label: 'Battle goat', make: () => buildGoat({}) },
];
