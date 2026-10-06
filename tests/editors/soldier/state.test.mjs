// Workshop document model: point-buy math, slots <-> registry categories, undo/redo with merging, randomise/mutate always legal, the checks list (E4, E9).
import assert from 'node:assert/strict';
import { SoldierDoc, PART_TABS, SLOT_DEFS, getSlot, setIn, clampStat, poolLeft, randomStats, checkIssues, pointsToKeepWeapon, C } from '../../../src/editors/soldier/state.js';
import { PART_REGISTRY, CATEGORIES, listParts, isPartUnlocked } from '../../../src/content/era_ancient/blueprints.js';
import { checkSoldier } from '../../../src/save/validate.js';
import { RNG } from '../../../src/core/rng.js';

// ---- tabs map onto exactly the 12 registry categories (editors.md §2)
{ const cats = new Set(); for (const t of PART_TABS) for (const s of t.slots) { assert.ok(CATEGORIES[s.cat], s.cat); cats.add(s.cat); } assert.equal(cats.size, 12); assert.deepEqual(Array.from(cats).sort(), Object.keys(CATEGORIES).sort());
  assert.deepEqual(PART_TABS.map((t) => t.id), ['head', 'torso', 'shoulders', 'legs', 'cape', 'back', 'main', 'off']);
  assert.deepEqual(PART_TABS[0].slots.map((s) => s.cat), ['helms', 'hair', 'faces']); assert.deepEqual(PART_TABS[1].slots.map((s) => s.cat), ['tunics', 'armors']); assert.deepEqual(PART_TABS[3].slots.map((s) => s.cat), ['legs', 'skirts']); }

const doc = new SoldierDoc(C.newSoldier(new RNG(3)), { rng: new RNG(9) });
const start = doc.cs;
// ---- slots read/write the right blueprint fields
for (const [slot, id] of [['head.helm', 'attic'], ['head.hair', 'mohawk'], ['head.face', 'goatee'], ['torso.tunic', 'toga'], ['torso.armor', 'scale_mail'], ['legs.armor', 'boots'], ['legs.skirt', 'pteruges'], ['shoulders', 'pauldrons'], ['cape', 'long'], ['back', 'quiver'], ['main', 'gladius'], ['off', 'buckler']]) {
  assert.ok(doc.setSlot(slot, id), slot); assert.equal(getSlot(doc.cs, slot), id);
}
assert.equal(doc.cs.blueprint.head.helm, 'attic'); assert.equal(doc.cs.blueprint.legs.skirt, 'pteruges'); assert.equal(doc.cs.blueprint.off, 'buckler');
assert.ok(!doc.setSlot('head.helm', 'not_a_helm')); assert.ok(!doc.setSlot('head.helm', 'colander'), 'locked parts cannot be picked (E9)');
{ const d2 = new SoldierDoc(start, { unlocked: new Set(['silly_helms']) }); assert.ok(d2.setSlot('head.helm', 'colander'), 'and can once the campaign grants the key'); }
assert.equal(start.blueprint.head.helm, 'corinthian', 'edits never mutate the previous tree (structural sharing)');
// ---- undo / redo, 100 steps
{ const n = doc.undo.depth; assert.ok(doc.doUndo()); assert.equal(getSlot(doc.cs, 'off'), 'hoplon'); assert.ok(doc.doRedo()); assert.equal(getSlot(doc.cs, 'off'), 'buckler'); assert.ok(n >= 12);
  const d3 = new SoldierDoc(start); for (let i = 0; i < 130; i++) d3.setSlot('head.helm', i % 2 ? 'attic' : 'laurel'); assert.equal(d3.undo.depth, 100, 'history is limited to 100 steps'); }
// ---- point buy: caps, the 100 total, merging of slider drags
{ const d = new SoldierDoc(C.newSoldier(new RNG(1))); assert.ok(d.resetStats());
  assert.equal(d.setStat('hp', 99), 30, 'per-stat cap'); assert.equal(d.setStat('damage', 99), 30); assert.equal(d.setStat('attackSpeed', 99), 20); assert.equal(d.setStat('speed', 99), 20); assert.equal(poolLeft(d.cs.stats), 0);
  assert.equal(d.setStat('armor', 15), 0, 'the pool is empty: nothing more can be bought'); assert.equal(d.setStat('hp', 10), 10); assert.equal(poolLeft(d.cs.stats), 20); assert.equal(d.setStat('armor', 25), 20, 'cap 20 and 20 points left'); assert.equal(d.setStat('range', 25), 0);
  assert.equal(C.statsTotal(d.cs.stats), 100); assert.equal(d.setStat('hp', -5), 0); assert.equal(clampStat({ hp: 5 }, 'range', 99), 10);
  const before = d.undo.depth; for (let i = 0; i < 12; i++) d.setStat('morale', i % 11); assert.equal(d.undo.depth, before + 1, 'a slider drag is one undo step'); assert.equal(C.statsTotal(d.cs.stats) <= 100, true); }
for (let i = 0; i < 100; i++) { const st = randomStats(new RNG(i)); assert.ok(C.statsTotal(st) <= 100 && C.statsTotal(st) >= 70); for (const k of C.STAT_KEYS) assert.ok(st[k] >= 0 && st[k] <= C.STAT_CAPS[k]); }
// ---- weapon change drops abilities that stopped being legal
{ const d = new SoldierDoc(C.newSoldier(new RNG(4))); d.setSlot('main', 'gladius'); assert.ok(d.toggleAbility('kick')); assert.ok(d.toggleAbility('rage')); assert.ok(!d.toggleAbility('net'), 'two abilities at most'); assert.ok(!d.toggleAbility('heal_pulse'), 'heal_pulse needs a staff'); assert.deepEqual(d.cs.abilities, ['kick', 'rage']);
  d.setSlot('main', 'longbow'); assert.deepEqual(d.cs.abilities, []); assert.deepEqual(d.notes, ['Spartan Kick', 'Rage']); d.doUndo(); assert.deepEqual(d.cs.abilities, ['kick', 'rage'], 'undo brings them back'); }
// ---- randomise / mutate / reset: always a legal soldier, 300 rounds
{ const d = new SoldierDoc(C.newSoldier(new RNG(5)), { rng: new RNG(77) });
  for (let i = 0; i < 300; i++) { i % 3 === 0 ? d.mutate() : d.randomize(); const r = checkSoldier(d.cs); assert.ok(r.ok, `round ${i}: ${r.errors.join(' | ')}`); assert.ok(C.statsTotal(d.cs.stats) <= 100); assert.equal(d.cs.blueprint.id, d.cs.id); for (const slot of Object.keys(SLOT_DEFS)) assert.ok(isPartUnlocked(PART_REGISTRY[SLOT_DEFS[slot].cat][getSlot(d.cs, slot)], undefined), 'no locked part without progress'); }
  const nm = d.cs.name; d.reset(); assert.equal(d.cs.name, nm); assert.equal(d.cs.blueprint.head.helm, 'corinthian'); assert.ok(checkSoldier(d.cs).ok); }
{ const d = new SoldierDoc(C.newSoldier(new RNG(6)), { rng: new RNG(1), unlocked: new Set(['silly_helms', 'silly_weapons', 'wings']) }); let silly = 0; for (let i = 0; i < 400; i++) { d.randomize(); const bp = d.cs.blueprint; if (['colander', 'traffic_cone', 'cooking_pot', 'straw_hat'].includes(bp.head.helm) || PART_REGISTRY.mains[bp.main].unlock || bp.back === 'wings') silly++; } assert.ok(silly > 10, 'unlocked silly parts do show up: ' + silly); }
// ---- naming and text edits
{ const d = new SoldierDoc(C.newSoldier(new RNG(8)), { rng: new RNG(2) }); d.newName(); assert.ok(d.cs.name.length >= 1 && d.cs.name.length <= 40); assert.equal(d.cs.blueprint.name, d.cs.name); d.setName('x'.repeat(60)); assert.equal(d.cs.name.length, 40);
  d.setCatch('c'.repeat(60)); assert.equal(d.cs.text.catch.length, 40); d.setDeath(1, 'Bye'); assert.equal(d.cs.text.deaths[1], 'Bye'); d.setPitch(5); assert.equal(d.cs.text.pitch, 1.4); d.setHeight(0.1); assert.equal(d.cs.height, 0.9); d.setHeight(9); assert.equal(d.cs.height, 1.2);
  const q = d.cs.text; d.surpriseQuotes(); assert.notDeepEqual(d.cs.text, q); assert.equal(d.cs.text.deaths.length, 3); assert.ok(checkSoldier(d.cs).ok); }
// ---- paint: set / clear keep everything else
{ const d = new SoldierDoc(C.newSoldier(new RNG(8))); d.setPaint({ head: { sx: 10, sy: 10, sz: 10, rle: [1000, 0] } }); assert.ok(d.cs.blueprint.paint.head); d.clearPaint('head'); assert.deepEqual(d.cs.blueprint.paint, {}); d.setPaint({ head: 1, body: 2 }); d.clearPaint(); assert.deepEqual(d.cs.blueprint.paint, {}); }
// ---- palettes, metal, emblem
{ const d = new SoldierDoc(C.newSoldier(new RNG(9))); assert.ok(d.applyPalette(2)); assert.equal(d.cs.blueprint.colors.primary, '#1f8f8a'); assert.ok(!d.applyPalette(99)); assert.ok(d.setMetal('steel')); assert.ok(!d.setMetal('mithril')); assert.ok(d.setEmblem('skull')); assert.ok(!d.setEmblem('dragon')); assert.equal(d.cs.blueprint.emblem, 'skull'); }
// ---- the checks list
{ const base = C.newSoldier(new RNG(10)); const info = (cs) => C.compileCustom(cs);
  assert.deepEqual(checkIssues(base, info(base), undefined).filter((i) => i.level !== 'info'), []);
  const two = setIn(setIn(base, ['blueprint', 'main'], 'sarissa'), ['blueprint', 'off'], 'hoplon'); const i2 = checkIssues(two, info(two), undefined); assert.ok(i2.some((i) => i.id === 'twohand' && i.fix.action === 'dropOff'));
  const trim = setIn(setIn(base, ['blueprint', 'main'], 'xyston'), ['stats', 'range'], 0); const i3 = checkIssues(trim, info(trim), undefined); assert.ok(i3.some((i) => i.id === 'trim'), 'weapon trimmed by reach is explained'); assert.ok(pointsToKeepWeapon(trim) >= 0);
  const locked = setIn(base, ['blueprint', 'head', 'helm'], 'colander'); const i4 = checkIssues(locked, info(locked), new Set()); assert.ok(i4.some((i) => i.id === 'locked:head.helm' && i.level === 'error' && /mission 3/.test(i.text))); assert.deepEqual(checkIssues(locked, info(locked), new Set(['silly_helms'])).filter((i) => i.level === 'error'), []);
  const noname = setIn(base, ['name'], ''); assert.ok(checkIssues(noname, null, undefined).some((i) => i.id === 'name' && i.level === 'error'));
  const slim = setIn(setIn(base, ['blueprint', 'body', 'type'], 'slim'), ['height'], 0.9); assert.ok(checkIssues(slim, info(slim), undefined).some((i) => i.id === 'scale' && /0\.85/.test(i.text)), 'the scale clamp is explained'); }
console.log('state OK');
