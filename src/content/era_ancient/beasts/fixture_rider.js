// Stand-in hum1 rider used until UNITS-LIB's compileSoldier supplies the real one (and by the tests/sheets).
// It carries the FULL hum1 part ids and canonical dims from spec 4.1 so the mounting code is exercised exactly as it will be with
// compileSoldier output: body, head, crest, armUL/UR, armLL/LR, weapon, offhand, legUL/UR, legLL/LR (+ optional back, cape, cape2).
import { LG, V, T, C, shade, newModel, addLG, attachLG } from './common.js';

const KINDS = {
  greek: { helm: 'boeotian', plume: 'white', armor: 'linen', weapon: 'lance', skin: 0xe0ac84, shield: false },
  roman: { helm: 'montefortino', plume: 'none', armor: 'mail', weapon: 'spear', skin: 0xe6b690, shield: 'parma' },
  persian: { helm: 'conical', plume: 'none', armor: 'scale', weapon: 'lance', skin: 0xc99770, shield: false, veil: true },
  cataphract: { helm: 'conical', plume: 'none', armor: 'scale', weapon: 'kontos', skin: 0xc99770, shield: false, veil: true },
  camel: { helm: 'turban', plume: 'none', armor: 'robe', weapon: 'spear', skin: 0xa87850, shield: false },
  numidian: { helm: 'bare', plume: 'none', armor: 'bare', weapon: 'javelin', skin: 0x6e4a32, shield: false, braids: true },
  centaur: { helm: 'bare', plume: 'none', armor: 'bare', weapon: 'bow', skin: 0xc9936a, shield: false, sash: true, hairLong: true, headband: true },
  archer: { helm: 'cap', plume: 'none', armor: 'linen', weapon: 'bow', skin: 0xd9a47c, shield: false, sash: true },
  hannibal: { helm: 'crest', plume: 'team', armor: 'bronze', weapon: 'spear', skin: 0xb98660, shield: false, cloak: true, eyepatch: true },
};

/** @param {string} kind key of KINDS  @param {{id?:string}} o */
export function buildFixtureRider(kind = 'greek', o = {}) {
  const K = Object.assign({}, KINDS[kind] || KINDS.greek, o);
  const skin = K.skin;
  const m = newModel(o.id || 'rider_' + kind, { rig: 'hum1', kind: 'humanoid', fixture: true });
  const cloth = T(0xffffff), clothDk = T(0xcfcfcf);
  const bronze = V(C.bronze), iron = V(C.iron), steel = V(C.steel), lin = V(C.linen), lea = V(C.leather);

  // ---- body (10,9,5) pivot (5,0,2.5)
  const body = new LG(10, 9, 5, 5, 0, 2.5);
  if (K.armor === 'bare') { body.box(-5, 0, -2.5, 5, 9, 2.5, V(skin)); body.box(-5, 0, -2.5, 5, 3, 2.5, cloth); body.box(-5, 3, 2.4, 5, 9, 2.5, V(shade(skin, 1.05)), 'set'); }
  else if (K.armor === 'scale') {
    body.box(-5, 0, -2.5, 5, 9, 2.5, (x, y, z) => ((Math.floor(y) + Math.floor(x + 20)) % 2 === 0 ? V(0xcfd5dc) : V(0xa6aeb8)));
    body.box(-5, 0, -2.5, 5, 2, 2.5, cloth);
  } else if (K.armor === 'mail') { body.box(-5, 0, -2.5, 5, 9, 2.5, (x, y, z) => ((Math.floor(y) + Math.floor(x + 20)) % 2 === 0 ? V(0xb8bec6) : V(0x9aa1ab))); body.box(-5, 0, -2.5, 5, 3, 2.5, cloth); }
  else if (K.armor === 'bronze') { body.box(-5, 0, -2.5, 5, 9, 2.5, V(C.bronze)); body.box(-5, 0, -2.5, 5, 2, 2.5, cloth); body.box(-1, 2, 2.4, 1, 8, 2.5, V(shade(C.bronze, 0.8))); }
  else if (K.armor === 'robe') { body.box(-5, 0, -2.5, 5, 9, 2.5, cloth); body.box(-5, 3, -2.5, 5, 4, 2.5, V(C.gold)); }
  else { body.box(-5, 0, -2.5, 5, 9, 2.5, lin); body.box(-5, 0, -2.5, 5, 3, 2.5, cloth); body.box(-5, 6, -2.5, 5, 7, 2.5, cloth); }
  if (K.sash) for (let y = 0; y < 9; y++) body.box(-5 + y * 0.9 - 1, y, 2.3, -5 + y * 0.9 + 1.4, y + 1, 2.7, cloth);   // diagonal team sash
  body.box(-5, 0, -2.5, 5, 1, 2.5, lea);                                        // belt
  body.box(-1, 0, 2.4, 1, 1, 2.6, V(C.gold));
  addLG(m, 'body', body, { origin: [0, 10, 0] });

  // ---- head (10,10,10) pivot (5,0,5)
  const head = new LG(10, 10, 10, 5, 0, 5);
  head.box(-3, 0, -3, 3, 6, 3, V(skin));
  head.set(-1.5, 3.5, 3.1, V(C.eye)); head.set(1.5, 3.5, 3.1, V(C.eye));
  head.box(-1, 1, 3, 1, 2, 3.4, V(shade(skin, 0.75)));
  if (K.eyepatch) { head.set(1.5, 3.5, 3.4, V(0x111111)); head.box(-3, 4.5, 0, 3, 5, 3, V(0x111111), 'empty'); }
  if (K.braids) { head.box(-3.4, 4.6, -3.4, 3.4, 6.4, 3.4, V(0x1c130d)); head.box(-3.4, 1, -3.4, -2.6, 4.6, 2, V(0x1c130d)); head.box(2.6, 1, -3.4, 3.4, 4.6, 2, V(0x1c130d)); head.box(-3.4, 0, -3.4, -2.6, 2, -1, V(0x1c130d)); head.box(2.6, 0, -3.4, 3.4, 2, -1, V(0x1c130d)); }
  const helmCol = K.helm === 'conical' ? V(C.steel) : K.helm === 'montefortino' ? bronze : K.helm === 'boeotian' ? bronze : bronze;
  if (K.helm === 'boeotian') { head.box(-3.4, 4.4, -3.4, 3.4, 6.4, 3.4, helmCol); head.box(-5, 4.2, -5, 5, 5, 5, helmCol); head.box(-1, 6.4, -1, 1, 7.4, 1, helmCol); }
  else if (K.helm === 'montefortino') { head.box(-3.4, 3.8, -3.4, 3.4, 6.6, 3.4, helmCol); head.box(-3.4, 1, -3.4, 3.4, 3.8, -2.4, helmCol); head.box(-3.7, 0.5, -1, -2.9, 3.8, 2.5, helmCol); head.box(2.9, 0.5, -1, 3.7, 3.8, 2.5, helmCol); head.box(-1, 6.6, -2, 1, 7.6, 1, V(C.steel)); }
  else if (K.helm === 'conical') {
    head.box(-3.4, 4, -3.4, 3.4, 6, 3.4, helmCol); head.box(-2.4, 6, -2.4, 2.4, 8, 2.4, helmCol); head.box(-1, 8, -1, 1, 9.4, 1, V(C.gold));
    head.box(-3.4, 0, -3.4, 3.4, 4, -2.6, V(0xa6aeb8)); if (K.veil) { head.box(-3.4, 0, 2.6, 3.4, 1.4, 3.5, V(0xa6aeb8)); head.box(-3.7, 0, -3.4, -2.9, 4, 3.4, V(0xa6aeb8)); head.box(2.9, 0, -3.4, 3.7, 4, 3.4, V(0xa6aeb8)); }
  } else if (K.helm === 'turban') {
    head.box(-3.8, 4.4, -3.8, 3.8, 7.4, 3.8, cloth); head.box(-3.8, 5.4, -3.8, 3.8, 5.9, 3.8, clothDk); head.box(-1.5, 7.4, -1.5, 1.5, 8.2, 1.5, cloth); head.box(-3.4, 1, -3.4, 3.4, 4.4, -2.6, V(0x2a1c12));
  } else if (K.helm === 'crest') { head.box(-3.4, 3.8, -3.4, 3.4, 6.6, 3.4, bronze); head.box(-3.4, 1, -3.4, 3.4, 3.8, -2.4, bronze); head.box(-3.7, 0.5, 0, -2.9, 3.8, 3, bronze); head.box(2.9, 0.5, 0, 3.7, 3.8, 3, bronze); head.box(-1, 6.6, -2, 1, 8, 1, bronze); }
  else if (!K.braids) { head.box(-3.4, 4.8, -3.4, 3.4, 6.6, 3.4, V(0x3a281c)); head.box(-3.4, 1, -3.4, 3.4, 4.8, -2.6, V(0x3a281c)); if (K.hairLong) head.box(-3.4, -3, -3.6, 3.4, 1, -2.6, V(0x3a281c)); if (K.headband) head.box(-3.5, 4.2, -3.5, 3.5, 5.2, 3.5, cloth); }
  addLG(m, 'head', head, { parent: 'body', origin: [0, 9, 0] });

  // ---- crest (10,8,12) pivot (5,0,6): plume volume (empty for helmets without one)
  const crest = new LG(10, 8, 12, 5, 0, 6);
  if (K.plume === 'white') { crest.box(-0.5, 0, -5, 0.5, 4, 3, V(0xf4f4ee)); crest.box(-1, 0, -6, 1, 3, -4, V(0xf4f4ee)); crest.box(-0.5, 4, -4, 0.5, 5, 1, V(0xf4f4ee)); }
  else if (K.plume === 'team') { crest.box(-0.5, 0, -6, 0.5, 6, 4, cloth); crest.box(-1, 0, -6, 1, 4, -3, cloth); crest.box(-0.5, 6, -4, 0.5, 7, 1, cloth); }
  if (crest.count()) addLG(m, 'crest', crest, { parent: 'head', origin: [0, 6, 0] });

  // ---- arms
  const armU = () => new LG(3, 5, 3, 1.5, 5, 1.5).box(-1.5, 0, -1.5, 1.5, 5, 1.5, K.armor === 'bare' ? V(skin) : cloth);
  const armL = () => { const a = new LG(3, 5, 3, 1.5, 5, 1.5); a.box(-1.5, 0, -1.5, 1.5, 5, 1.5, V(skin)); a.box(-1.5, 2.6, -1.5, 1.5, 4.4, 1.5, K.armor === 'scale' ? V(C.steel) : lea); return a; };
  addLG(m, 'armUL', armU(), { parent: 'body', origin: [6.5, 8, 0] });
  addLG(m, 'armLL', armL(), { parent: 'armUL', origin: [0, -5, 0] });
  addLG(m, 'armUR', armU(), { parent: 'body', origin: [-6.5, 8, 0] });
  addLG(m, 'armLR', armL(), { parent: 'armUR', origin: [0, -5, 0] });

  // ---- weapon (9,48,9) pivot (4,10,4): shaft along +Y from the grip
  const wp = new LG(9, 48, 9, 4, 10, 4);
  const shaft = V(C.wood);
  if (K.weapon === 'lance' || K.weapon === 'kontos') {
    const L = K.weapon === 'kontos' ? 38 : 34;
    wp.box(-0.5, -9, -0.5, 0.5, L, 0.5, shaft); wp.box(-1, -9, -1, 1, -3, 1, shaft);
    wp.box(-1, L, -1, 1, L + 1, 1, steel); wp.box(-0.5, L + 1, -0.5, 0.5, L + 4, 0.5, steel);
    wp.box(-1.5, L - 8, -1.5, 1.5, L - 7, 1.5, cloth);                          // pennant stub (team)
  } else if (K.weapon === 'bow') {
    const wood = V(0x8a5a2e);
    for (let y = -10; y <= 14; y++) { const t = y >= 0 ? y / 14 : -y / 10, z = -Math.round(3.2 * t * t); wp.box(-0.5, y, z - 0.5, 0.5, y + 1, z + 0.5, wood); if (Math.abs(y) < 3) wp.box(-1, y, z - 0.5, 1, y + 1, z + 1, V(C.leather)); }
    wp.line([0, 14, -3], [0, -10, -3], V(0xe8e0c8));                              // string (behind the limbs, toward the archer)
  } else if (K.weapon === 'javelin') {
    wp.box(-0.5, -4, -0.5, 0.5, 22, 0.5, shaft); wp.box(-0.5, 22, -0.5, 0.5, 26, 0.5, steel);
  } else {
    wp.box(-0.5, -9, -0.5, 0.5, 30, 0.5, shaft); wp.box(-1, 30, -1, 1, 31, 1, steel); wp.box(-0.5, 31, -0.5, 0.5, 35, 0.5, steel);
  }
  addLG(m, 'weapon', wp, { parent: 'armLR', origin: [0, -4, 0.5], rest: K.weapon === 'bow' ? [0, 0, 0] : [-1.35, 0, 0] });
  m.addAttach('grip_main', 'weapon', [4, 10, 4]);
  m.addAttach('muzzle', 'weapon', [4, 40, 4]);

  // ---- offhand (16,16,6) pivot (8,8,3): parma / none
  const off = new LG(16, 16, 6, 8, 8, 3);
  if (K.shield) { off.ell(0, 0, 0, 6.5, 6.5, 1.2, cloth); off.ell(0, 0, 1.3, 2.4, 2.4, 0.9, bronze); off.box(-0.5, -6.6, 0.5, 0.5, -6, 1.5, bronze); } else { off.box(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, V(skin)); }
  addLG(m, 'offhand', off, { parent: 'armLL', origin: [0, -4, 0.5] });

  // ---- legs
  const legU = (c) => new LG(4, 5, 4, 2, 5, 2).box(-2, 0, -2, 2, 5, 2, c);
  const legL = (c, b) => { const l = new LG(4, 5, 6, 2, 5, 2); l.box(-2, 0, -2, 2, 5, 2, c); l.box(-2, 0, -2, 2, 2, 3, b); return l; };
  const pants = K.armor === 'bare' || K.armor === 'robe' ? V(0xd8cdb0) : lin;
  addLG(m, 'legUL', legU(pants), { origin: [3, 10, 0] });
  addLG(m, 'legLL', legL(V(skin), lea), { parent: 'legUL', origin: [0, -5, 0] });
  addLG(m, 'legUR', legU(pants), { origin: [-3, 10, 0] });
  addLG(m, 'legLR', legL(V(skin), lea), { parent: 'legUR', origin: [0, -5, 0] });

  // ---- cloak (team) hanging from the shoulders: cape + cape2 ; quiver/back for javelins
  if (K.cloak || kind === 'greek' || kind === 'roman' || kind === 'persian' || kind === 'cataphract') {
    const cape = new LG(10, 14, 2, 5, 14, 1); cape.box(-5, 0, -1, 5, 14, 1, cloth); cape.box(-5, 0, -1, 5, 1, 1, V(C.gold));
    addLG(m, 'cape', cape, { parent: 'body', origin: [0, 8, -3] });
    const cape2 = new LG(10, 10, 2, 5, 10, 1); cape2.box(-5, 0, -1, 5, 10, 1, clothDk); cape2.box(-5, 0, -1, 5, 1, 1, V(C.gold));
    addLG(m, 'cape2', cape2, { parent: 'cape', origin: [0, -14, 0] });
  }
  if (K.weapon === 'bow') {
    const back = new LG(12, 14, 8, 6, 7, 8); back.box(-1.5, -5, -5, 1.5, 6, -1.2, V(C.leather)); for (let i = -1; i <= 1; i++) back.box(i - 0.4, 6, -4.5, i + 0.4, 10, -3.5, V(C.linen)); back.box(-1.5, 5.5, -5, 1.5, 6.2, -1.2, cloth);
    addLG(m, 'back', back, { parent: 'body', origin: [0, 7, -2.5] });
  }
  if (K.weapon === 'javelin') {
    const back = new LG(12, 14, 8, 6, 7, 8); back.box(-1, -6, -5, 1, 6, -1, V(C.leather)); for (let i = -3; i <= 3; i += 3) back.box(i - 0.5, 6, -4.5, i + 0.5, 12, -3.5, V(C.wood));
    addLG(m, 'back', back, { parent: 'body', origin: [0, 7, -2.5] });
  }
  m.addAttach('eyes', 'head', [5, 3.5, 8]);
  m.addAttach('head_top', 'head', [5, 10, 5]);
  m.addAttach('body_center', 'body', [5, 4.5, 2.5]);
  m.addAttach('feet', 'legLL', [2, 0, 2]);
  return m;
}
export const FIXTURE_KINDS = Object.keys(KINDS);
