// Part library: every registered part builds on its canonical hum1 grid without out-of-bounds writes (criterion U2/E4 groundwork),
// the registry meets the spec quotas, and part builders are deterministic.
import assert from 'node:assert/strict';
import { VoxelGrid } from '../../src/voxel/grid.js';
import { PART_REGISTRY, CATEGORIES, DIM, makeCtx, listParts, isPartUnlocked, UNLOCKS, defaultBlueprint, validateBlueprint } from '../../src/content/era_ancient/blueprints.js';
import { RNG, hashString } from '../../src/core/rng.js';

// ---- out-of-bounds write detector: wraps VoxelGrid.set / setIfEmpty
let oob = [], ctxTag = '';
const allOob = [];
const origSet = VoxelGrid.prototype.set, origIfEmpty = VoxelGrid.prototype.setIfEmpty;
function check(g, x, y, z) { x = Math.round(x); y = Math.round(y); z = Math.round(z); if (!g.inb(x, y, z)) oob.push(`${ctxTag} wrote (${x},${y},${z}) outside ${g.sx}x${g.sy}x${g.sz}`); }
VoxelGrid.prototype.set = function (x, y, z, v) { if (v) check(this, x, y, z); return origSet.call(this, x, y, z, v); };       // erasing (v=0) outside is harmless
VoxelGrid.prototype.setIfEmpty = function (x, y, z, v) { if (v) check(this, x, y, z); return origIfEmpty.call(this, x, y, z, v); };

const bp0 = defaultBlueprint();
const vb = validateBlueprint(bp0); assert.ok(vb.ok, vb.errors.join(' '));

function contextFor(entry, bp) {
  const ctx = makeCtx(bp, {});
  ctx.rng = new RNG(hashString(bp.id + entry.id));
  ctx.len = entry.meta.len || 0; ctx.back = entry.meta.back ?? 8;
  return ctx;
}
function toMap(entry, out) { return out instanceof VoxelGrid ? { [CATEGORIES[entry.category].target]: out } : (out || {}); }
function hashGrid(g) { let h = 2166136261; for (let i = 0; i < g.d.length; i++) h = Math.imul(h ^ g.d[i], 16777619) >>> 0; return h; }

let parts = 0, voxels = 0;
const colorSets = [
  bp0,
  Object.assign(JSON.parse(JSON.stringify(bp0)), { colors: { primary: '#2a5db0', secondary: '#ffffff', trim: '#111111', metal: 'blackiron', cloth: '#ffffff' }, emblem: 'skull' }),
  Object.assign(JSON.parse(JSON.stringify(bp0)), { colors: { primary: '#d4a017', secondary: '#111111', trim: '#ffeecc', metal: 'silver', cloth: '#222222' }, emblem: 'eagle' }),
];
for (const [ci, bp] of colorSets.entries()) {
  for (const cat of Object.keys(PART_REGISTRY)) {
    for (const id of Object.keys(PART_REGISTRY[cat])) {
      const e = PART_REGISTRY[cat][id];
      assert.equal(e.id, id); assert.equal(e.category, cat);
      assert.ok(e.name && typeof e.name === 'string', `${cat}.${id} has a name`);
      oob = []; ctxTag = `${cat}.${id}[${ci}]`;
      const ctx = contextFor(e, bp);
      const out = e.build(ctx);
      const map = toMap(e, out);
      for (const pid of Object.keys(map)) {
        const g = map[pid]; if (!g) continue;
        assert.ok(DIM[pid], `${ctxTag} returned unknown part ${pid}`);
        assert.deepEqual([g.sx, g.sy, g.sz], DIM[pid].size, `${ctxTag} ${pid} is not on the canonical grid`);
        for (let i = 0; i < g.d.length; i++) assert.ok(g.d[i] === 0 || (g.d[i] >>> 24 & 1) === 1, `${ctxTag} ${pid} has a voxel without the solid flag`);
        voxels += g.count(); parts++;
        if (ci === 0) { const again = toMap(e, e.build(contextFor(e, bp))); assert.equal(hashGrid(again[pid]), hashGrid(g), `${ctxTag} ${pid} is not deterministic`); }
      }
      allOob.push(...new Set(oob));
    }
  }
}
VoxelGrid.prototype.set = origSet; VoxelGrid.prototype.setIfEmpty = origIfEmpty;
assert.deepEqual(allOob, [], 'out-of-bounds writes (first 40): ' + allOob.slice(0, 40).join(' | '));

// ---- quotas (task brief / editors.md)
const n = (c) => Object.keys(PART_REGISTRY[c]).length;
assert.ok(n('helms') >= 22, `helms ${n('helms')}`);
assert.ok(n('hair') >= 12, 'hair styles');
assert.ok(n('tunics') + n('armors') >= 12, `torsos ${n('tunics') + n('armors')}`);
assert.ok(n('shoulders') >= 4 && n('legs') >= 6 && n('capes') >= 4 && n('backs') >= 7, 'shoulders/legs/capes/backs');
assert.ok(n('mains') >= 27, `mains ${n('mains')}`);
assert.ok(n('offs') >= 9, `offs ${n('offs')}`);
for (const id of ['stubble', 'beard_short', 'beard_long', 'beard_braided', 'beard_pointy', 'moustache_huge', 'eyepatch', 'warpaint', 'none']) assert.ok(PART_REGISTRY.faces[id], 'face ' + id);
for (const id of ['none', 'laurel', 'corinthian', 'attic', 'phrygian', 'chalcidian', 'galea', 'montefortino', 'centurion_crest', 'nemes', 'pschent', 'khepresh', 'persian_tiara', 'persian_cap', 'gallic_winged', 'horned', 'wolf_hood', 'boar_helm', 'bull_head', 'jackal_head', 'cyclops_head', 'snake_hair', 'colander', 'traffic_cone', 'cooking_pot', 'straw_hat']) assert.ok(PART_REGISTRY.helms[id], 'helm ' + id);
for (const id of ['dory', 'short_spear', 'sarissa', 'xiphos', 'gladius', 'spatha', 'khopesh', 'axe', 'double_axe', 'mace', 'club', 'hammer', 'trident', 'javelin', 'bow', 'composite_bow', 'sling', 'staff', 'scepter', 'crook_flail', 'torch', 'sickle', 'vine_staff', 'greataxe', 'scimitar', 'xyston', 'kontos', 'fish', 'rubber_chicken', 'baguette', 'frying_pan', 'scroll_of_doom', 'olive_branch', 'foam_finger']) assert.ok(PART_REGISTRY.mains[id], 'weapon ' + id);
for (const id of ['hoplon', 'scutum', 'wicker', 'hide_shield', 'round_shield', 'buckler', 'torch', 'second_sword', 'quiver_hand', 'none']) assert.ok(PART_REGISTRY.offs[id], 'offhand ' + id);
for (const id of ['chiton', 'thorax_bronze', 'lorica_segmentata', 'scale_mail', 'chainmail', 'leather', 'linen_kilt', 'toga', 'fur_pelt', 'robe', 'bandages', 'bare_warpaint']) assert.ok(PART_REGISTRY.tunics[id] || PART_REGISTRY.armors[id], 'torso ' + id);
for (const id of ['none', 'pauldrons', 'lion_mantle', 'scarf']) assert.ok(PART_REGISTRY.shoulders[id], 'shoulders ' + id);
for (const id of ['bare', 'greaves', 'greaves_bronze', 'trousers', 'wraps', 'shorts']) assert.ok(PART_REGISTRY.legs[id], 'legs ' + id);
for (const id of ['none', 'quiver', 'banner_pole', 'backpack', 'wings', 'sun_disc', 'bow_case']) assert.ok(PART_REGISTRY.backs[id], 'back ' + id);

// weapon metadata contract
const STYLES = ['slash', 'thrust', 'overhead', 'bash', 'shoot', 'throw', 'cast', 'pike', 'none'];
for (const id of Object.keys(PART_REGISTRY.mains)) {
  const m = PART_REGISTRY.mains[id].meta;
  assert.ok(STYLES.includes(m.style), `${id} style ${m.style}`);
  assert.ok(Array.isArray(m.rest) && m.rest.length === 3 && m.rest.every(Number.isFinite), `${id} rest`);
  assert.deepEqual(m.grip, [4, 10, 4], `${id} grip`);
  if (id !== 'none') { assert.ok(m.len >= 6 && m.len <= 38, `${id} len ${m.len}`); assert.ok((m.back ?? 8) <= 10, `${id} back`); }
}

// unlocks: silly parts are locked until their key is granted (E9)
const locked = ['colander', 'traffic_cone', 'cooking_pot', 'straw_hat'].map((i) => PART_REGISTRY.helms[i]);
for (const e of locked) { assert.equal(e.unlock.key, 'silly_helms'); assert.ok(!isPartUnlocked(e, new Set())); assert.ok(isPartUnlocked(e, new Set(['silly_helms']))); }
assert.ok(!isPartUnlocked(PART_REGISTRY.backs.wings, undefined) && isPartUnlocked(PART_REGISTRY.backs.wings, ['wings']));
for (const id of ['fish', 'rubber_chicken', 'baguette', 'frying_pan', 'scroll_of_doom', 'olive_branch', 'foam_finger']) assert.equal(PART_REGISTRY.mains[id].unlock.key, 'silly_weapons', id);
assert.equal(listParts('helms', new Set()).filter((p) => p.locked).length, 4);
assert.equal(listParts('helms', new Set(['silly_helms'])).filter((p) => p.locked).length, 0);
assert.ok(UNLOCKS.wings.hint.length > 10);

console.log(`parts.test OK: ${parts} part-grids, ${voxels} voxels, ${Object.keys(PART_REGISTRY).map((c) => c + ':' + n(c)).join(' ')}`);
