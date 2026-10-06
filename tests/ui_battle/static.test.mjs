// Static (Node) checks for the battle-side UI data: portrait grids, icon names used by the HUD and screens, and key bindings vs app/input.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTRAIT_DATA, PALETTE } from '../../src/ui/hud/_portraits.js';
import { ICON_NAMES, POWER_ICON, STATUS_ICON } from '../../src/ui/hud/_icons.js';
import { ACTIONS, FIXED } from '../../src/ui/hud/_bindings.js';
import { DEFAULT_KEYS } from '../../src/app/input.js';
import { check, finish } from './_lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// portraits: 16x16 grids, only palette letters, overlays line up
for (const [who, f] of Object.entries(PORTRAIT_DATA)) {
  check(who + ': 16 rows of 16 cells', f.rows.length === 16 && f.rows.every((r) => r.length === 16), f.rows.map((r) => r.length).join(','));
  const used = new Set((f.rows.join('') + Object.values(f.talk || {}).join('') + Object.values(f.blink || {}).join('')).replace(/\./g, ''));
  check(who + ': every colour letter is in the palette', [...used].every((c) => PALETTE[c]), [...used].filter((c) => !PALETTE[c]).join(''));
  check(who + ': talk and blink rows are 16 wide and index real rows', [...Object.entries(f.talk || {}), ...Object.entries(f.blink || {})].every(([y, r]) => r.length === 16 && +y >= 0 && +y < 16));
  check(who + ': has a name, role and colour for the name plate', !!(f.name && f.role && /^#/.test(f.color)));
}
check('three announcers', Object.keys(PORTRAIT_DATA).sort().join() === 'brutus,cassandra,plato');

// icons: every literal icon('name') in the HUD + screens files that import hud/_icons.js resolves
const names = new Set(ICON_NAMES);
const files = [];
for (const d of ['src/ui/hud', 'src/ui/screens']) for (const f of fs.readdirSync(path.join(root, d))) if (f.endsWith('.js')) files.push(path.join(d, f));
const missing = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  if (!/_icons\.js'/.test(src)) continue;
  for (const m of src.matchAll(/\bicon\('([a-z_0-9]+)'/g)) if (!names.has(m[1])) missing.push(f + ':' + m[1]);
}
check('all icon() names used by HUD/screens exist in hud/_icons.js', missing.length === 0, missing.join(', '));
check('god power icons exist', Object.values(POWER_ICON).every((n) => names.has(n)) && Object.keys(POWER_ICON).length === 6);
check('status icons exist for all 16 status effects', Object.values(STATUS_ICON).every((n) => names.has(n)) && Object.keys(STATUS_ICON).length === 16);

// the screens that use kit icons only use names UI-A defines
const kitIcons = new Set(Object.keys((await import('../../src/ui/icons.js')).ICONS));
const kitMissing = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of src.matchAll(/\bicon: '([a-z_0-9]+)'|K\.iconButton\('([a-z_0-9]+)'|iconAfter: '([a-z_0-9]+)'/g)) { const n = m[1] || m[2] || m[3]; if (!kitIcons.has(n)) kitMissing.push(f + ':' + n); }
}
check('kit button/chip/tablet icon names exist in ui/icons.js', kitMissing.length === 0, kitMissing.join(', '));

// bindings agree with app/input.js (single key table for the shell and the HUD)
const mismatch = ACTIONS.filter((a) => DEFAULT_KEYS[a.id] !== a.def).map((a) => a.id + ' ' + a.def + ' vs ' + DEFAULT_KEYS[a.id]);
check('rebindable action ids + default codes match app/input.js DEFAULT_KEYS', mismatch.length === 0, mismatch.join('; '));
const fixedMismatch = Object.entries(FIXED).filter(([id, code]) => id !== 'menu' && DEFAULT_KEYS[id] !== code).map(([id, code]) => id + ' ' + code + ' vs ' + DEFAULT_KEYS[id]);
check('fixed battle keys match app/input.js DEFAULT_KEYS', fixedMismatch.length === 0, fixedMismatch.join('; '));
const codes = [...ACTIONS.filter((a) => a.ctx === 'camera' || a.ctx === 'control').map((a) => a.def), FIXED.hide_hud, FIXED.help, FIXED.minimap, FIXED.command, FIXED.order_advance, FIXED.order_hold, FIXED.power_1, FIXED.power_2, FIXED.power_3, FIXED.power_4, FIXED.power_5, FIXED.power_6];
check('no key collisions inside the battle context', new Set(codes).size === codes.length, codes.filter((c, i) => codes.indexOf(c) !== i).join(','));
check('at least 8 rebindable actions (UI8)', ACTIONS.length >= 8);
finish('static');
