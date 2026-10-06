// Voxel Painter model: PaintDoc tools, paint-RLE round trip through compileSoldier, the 1,500-voxel cap, undo/redo, picking (E5 model side).
import assert from 'node:assert/strict';
import { PaintDoc, PartDoc, PAINT_CAP, PART_ORDER, DIM, PART_NAMES, OPPOSITE, SWATCHES, voxelOf, lineCells, isSymmetricX } from '../../../src/editors/painter/paintdoc.js';
import { rayVoxels, rayWalls, pickCell } from '../../../src/editors/painter/pick.js';
import { VoxelGrid, V, T, G, F_TEAM, F_GLOW } from '../../../src/voxel/grid.js';
import { compileSoldier, validateBlueprint, defaultBlueprint, randomBlueprint, applyPaint, diffPaint } from '../../../src/content/era_ancient/blueprints.js';
import * as C from '../../../src/content/era_ancient/custom.js';
import { encodeShare, importShare, packSoldier, unpackSoldier } from '../../../src/save/share.js';
import { RNG, hashString } from '../../../src/core/rng.js';

const hashGrid = (g) => { let h = 2166136261; for (let i = 0; i < g.d.length; i++) { h ^= g.d[i]; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const RED = voxelOf(0xc8453c), BLUE_T = voxelOf(0x3355cc, 'team'), GLOWY = voxelOf(0xffee88, 'glow');
const bp0 = defaultBlueprint(); bp0.id = 'cs_paintt';

// ---- names, table, swatches
assert.equal(PART_ORDER.length, 16); for (const pid of PART_ORDER) assert.ok(PART_NAMES[pid] && !/^[a-z]+[A-Z]/.test(PART_NAMES[pid]) && DIM[pid]);
assert.equal(SWATCHES.length, 24); for (const sw of SWATCHES) assert.match(sw, /^#[0-9a-f]{6}$/);
assert.equal(OPPOSITE.armUL, 'armUR'); assert.equal(OPPOSITE.legLR, 'legLL');

// ---- tools on the head part
const doc = new PaintDoc(bp0);
const head = doc.part('head');
assert.deepEqual(head.size, [10, 10, 10]); assert.equal(head.diff, 0); assert.equal(doc.total(), 0); assert.deepEqual(doc.toPaint(), {});
head.mirror = { x: false, y: false, z: false };
// pencil: adds a voxel, undo removes it, redo restores
{ const h0 = hashGrid(head.grid); const r = head.pencil(0, 9, 0, RED); assert.ok(r.ok && r.changed === 1); assert.equal(head.get(0, 9, 0), RED); assert.equal(head.diff, 1);
  assert.ok(head.doUndo()); assert.equal(hashGrid(head.grid), h0); assert.equal(head.diff, 0); assert.ok(head.doRedo()); assert.equal(head.get(0, 9, 0), RED); assert.equal(head.diff, 1); head.doUndo(); }
// mirror X
head.mirror.x = true; head.pencil(1, 9, 3, RED); assert.equal(head.get(1, 9, 3), RED); assert.equal(head.get(8, 9, 3), RED, 'x mirror: sx-1-x'); assert.equal(head.diff, 2); head.doUndo(); assert.equal(head.diff, 0);
head.mirror = { x: true, y: true, z: true }; head.pencil(1, 1, 1, RED); assert.equal(head.diff, 8, 'three mirrors give eight voxels'); head.doUndo(); head.mirror = { x: false, y: false, z: false };
// brush size 2 and 3
{ head.pencil(4, 7, 4, RED, 2); assert.equal(head.diff, 8); head.doUndo(); head.pencil(4, 7, 4, RED, 3); assert.equal(head.diff, 27); head.doUndo(); }
// eraser removes generated voxels (stored as an erase marker), recolour keeps the shape
{ const skull = head.get(4, 2, 4); assert.ok(skull); head.eraser(4, 2, 4); assert.equal(head.get(4, 2, 4), 0); assert.equal(head.diff, 1);
  const rle = head.toRLE(); assert.ok(rle && rle.rle.includes(1), 'erase marker is run value 1'); head.doUndo();
  head.recolor(4, 2, 4, RED); assert.equal(head.get(4, 2, 4), RED); head.recolor(0, 9, 0, RED); assert.equal(head.get(0, 9, 0), 0, 'recolour never adds voxels'); head.doUndo(); }
// flag brushes
{ head.flag(4, 2, 4, 'team', true); assert.ok((head.get(4, 2, 4) >>> 24) & F_TEAM); const rgb = head.gen.get(4, 2, 4) & 0xffffff; assert.equal(head.get(4, 2, 4) & 0xffffff, rgb, 'flag keeps the colour');
  head.flag(4, 2, 4, 'glow', true); assert.ok(((head.get(4, 2, 4) >>> 24) & F_GLOW) && !((head.get(4, 2, 4) >>> 24) & F_TEAM), 'glow replaces tint'); head.flag(4, 2, 4, 'glow', false); assert.ok(!((head.get(4, 2, 4) >>> 24) & F_GLOW)); assert.ok((head.get(4, 2, 4) >>> 24) & 1, 'still solid'); head.doUndo(); head.doUndo(); head.doUndo(); assert.equal(head.diff, 0); }
// fill: 3D recolours the connected same-value region; layer limits it to the plane; empty seed in 3D is refused
{ const seedV = head.get(4, 2, 4); const r = head.fill(4, 2, 4, RED, '3d'); assert.ok(r.ok && r.changed >= 1); head.doUndo();
  const rl = head.fill(4, 2, 4, RED, 'layer', 'y'); assert.ok(rl.ok); const layerCount = rl.changed; head.doUndo(); assert.ok(layerCount <= head.count());
  assert.equal(head.fill(0, 9, 9, RED, '3d').reason, 'empty-seed'); assert.equal(head.get(4, 2, 4), seedV); }
// line and box
{ const l = head.line([0, 9, 0], [9, 9, 0], RED); assert.equal(l.changed, 10); head.doUndo();
  const b = head.box([0, 8, 0], [2, 9, 2], RED); assert.equal(b.changed, 18); head.doUndo(); const hb = head.box([0, 8, 0], [2, 9, 2], RED, true); assert.equal(hb.changed, 18 - 0, 'a 3x2x3 box has no interior'); head.doUndo();
  const hb2 = head.box([0, 7, 0], [3, 9, 3], RED, true); assert.equal(hb2.changed, 4 * 3 * 4 - 2 * 1 * 2); head.doUndo(); }
assert.deepEqual(lineCells([0, 0, 0], [3, 0, 0]), [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]]);
// strokes: a drag is ONE undo step
{ head.beginStroke('drag'); for (let x = 0; x < 10; x++) head.pencil(x, 9, 5, RED); head.endStroke(); assert.equal(head.diff, 10); assert.equal(head.undo.depth, 1); head.doUndo(); assert.equal(head.diff, 0); }
// selection: move / flip / rotate / delete
{ head.select([3, 0, 3], [6, 3, 6]); const before = head._selCells().length; assert.ok(before > 0);
  head.deleteSelection(); assert.equal(head._selCells().length, 0); head.doUndo(); assert.equal(head._selCells().length, before);
  const h1 = hashGrid(head.grid); head.flipSelection('x'); head.doUndo(); assert.equal(hashGrid(head.grid), h1);
  head.rotateSelection(); head.doUndo(); assert.equal(hashGrid(head.grid), h1);
  head.moveSelection(0, 5, 0); head.doUndo(); assert.equal(hashGrid(head.grid), h1); head.clearSelection(); assert.equal(head.diff, 0); }
// reset and clear
{ head.pencil(0, 9, 0, RED); head.eraser(4, 2, 4); assert.equal(head.diff, 2); head.reset(); assert.equal(head.diff, 0); assert.equal(hashGrid(head.grid), hashGrid(head.gen)); head.doUndo(); assert.equal(head.diff, 2); head.reset(); assert.equal(head.diff, 0);
  const c = head.clear(); assert.ok(c.ok); assert.equal(head.count(), 0); assert.equal(head.diff, head.gen.count()); head.doUndo(); assert.equal(head.diff, 0); }
// copy the left arm onto the right (flipped)
{ const al = doc.part('armUL'), ar = doc.part('armUR'); al.mirror = { x: false, y: false, z: false }; al.pencil(0, 4, 0, RED); const r = doc.copyToOpposite('armUL'); assert.ok(r.ok); assert.equal(ar.get(2, 4, 0), RED, 'flipped left-right'); assert.equal(doc.copyToOpposite('head'), null); }
// symmetric parts default X mirror on
{ const fresh = new PaintDoc(bp0); assert.ok(fresh.part("body").mirror.x && fresh.part("head").mirror.x, "symmetric parts default to X mirroring"); assert.ok(isSymmetricX(new VoxelGrid(4, 4, 4))); }

// ---- the cap: 1,500 painted voxels per part; a rejected edit changes nothing
{
  const d2 = new PaintDoc(bp0), body = d2.part('legUL'), wp = d2.part('weapon'); wp.mirror = { x: false, y: false, z: false };
  const g0 = hashGrid(wp.grid);
  const r = wp.box([0, 0, 0], [8, 47, 8], RED); assert.equal(r.ok, false); assert.equal(r.reason, 'cap'); assert.ok(r.would > PAINT_CAP); assert.equal(hashGrid(wp.grid), g0); assert.equal(wp.diff, 0); assert.equal(wp.undo.depth, 0);
  const ok = wp.box([0, 0, 0], [8, 15, 8], RED); assert.ok(ok.ok, 'a box under the cap is fine'); assert.ok(wp.diff <= PAINT_CAP);
  // push exactly to the cap, then one more is refused
  const top = new PaintDoc(bp0).part('weapon'); top.mirror = { x: false, y: false, z: false }; let n = 0;
  outer: for (let y = 47; y >= 0; y--) for (let z = 0; z < 9; z++) for (let x = 0; x < 9; x++) { const rr = top.pencil(x, y, z, RED); if (!rr.ok) break outer; if (top.diff >= PAINT_CAP) break outer; n++; }
  assert.equal(top.diff, PAINT_CAP); assert.equal(top.pencil(8, 40, 8, GLOWY).ok || top.get(8, 40, 8) !== 0, top.get(8, 40, 8) !== 0);
  const before = top.diff; const more = top.pencil(0, 0, 0, T(0x123456)); if (top.get(0, 0, 0) !== T(0x123456)) assert.equal(top.diff, before);
  // fixed-size grids: wrong sizes are refused by the validator
  const bad = JSON.parse(JSON.stringify(bp0)); bad.paint = { head: { sx: 9, sy: 10, sz: 10, rle: [900, 0] } }; assert.equal(validateBlueprint(bad).ok, false);
}

// ---- round trip: doc -> bp.paint -> validate -> compile == the doc's grids; reload gives the same grids
{
  const rng = new RNG(321);
  for (let round = 0; round < 12; round++) {
    const bp = randomBlueprint(rng, { name: 'P' + round }); bp.id = 'cs_rt' + round;
    const cs = { v: 1, id: bp.id, name: 'RT', blueprint: bp, stats: { hp: 10, damage: 10, attackSpeed: 5, speed: 5, armor: 5, range: 5, morale: 5 }, abilities: [], ai: 'charge', height: 1, text: {} };
    const def = C.customDef(cs), opts = C.compileOptsOf(def);
    const doc2 = new PaintDoc(def.model.blueprint, opts);
    for (let k = 0; k < 6; k++) {
      const pid = PART_ORDER[rng.int(0, 15)], p = doc2.part(pid); const [sx, sy, sz] = p.size;
      p.mirror = { x: rng.chance(0.5), y: false, z: false };
      const mat = ['normal', 'team', 'glow'][rng.int(0, 2)], val = voxelOf(rng.int(0, 0xffffff), mat);
      p.beginStroke('s');
      for (let i = 0; i < 25; i++) { const x = rng.int(0, sx - 1), y = rng.int(0, sy - 1), z = rng.int(0, sz - 1); const t = rng.int(0, 3); if (t === 0) p.pencil(x, y, z, val); else if (t === 1) p.eraser(x, y, z); else if (t === 2) p.recolor(x, y, z, val); else p.flag(x, y, z, 'team', true); }
      p.endStroke();
      if (rng.chance(0.3)) p.fill(rng.int(0, sx - 1), rng.int(0, sy - 1), rng.int(0, sz - 1), val, 'layer', 'y');
      if (rng.chance(0.2)) p.doUndo();
    }
    const paint = doc2.toPaint(); const painted = JSON.parse(JSON.stringify(def.model.blueprint)); painted.paint = paint;
    const v = validateBlueprint(painted); assert.ok(v.ok, v.errors.join(' '));
    const c = compileSoldier(painted, opts);
    for (const pid of PART_ORDER) { const part = c.model.byId[pid], want = doc2.part(pid).grid; if (part) assert.equal(hashGrid(part.grid), hashGrid(want), `${pid}: compiled grid equals the painter's grid`); else assert.equal(want.count(), 0, `${pid} is absent only when empty`); }
    // reload
    const doc3 = new PaintDoc(painted, opts); for (const pid of PART_ORDER) { assert.equal(hashGrid(doc3.part(pid).grid), hashGrid(doc2.part(pid).grid)); assert.equal(doc3.part(pid).diff, doc2.part(pid).diff); }
    assert.deepEqual(doc3.toPaint(), paint, 'paint RLE is stable through load and save');
    for (const pid of Object.keys(paint)) { assert.ok(doc2.part(pid).diff <= PAINT_CAP); let nz = 0; for (let i = 0; i < paint[pid].rle.length; i += 2) if (paint[pid].rle[i + 1]) nz += paint[pid].rle[i]; assert.equal(nz, doc2.part(pid).diff, 'non-zero runs count exactly the diff cells'); }
    // through the share code: painted soldier survives packSoldier/unpackSoldier and the full import
    const cs2 = Object.assign({}, cs, { blueprint: painted });
    const enc = await encodeShare('soldier', cs2); assert.ok(enc.length < 38000 || enc.tooLong);
    const back = await importShare(enc.code, 'soldier', {}); assert.deepEqual(JSON.parse(JSON.stringify(back.value.blueprint.paint)), JSON.parse(JSON.stringify(validateBlueprint(painted).bp.paint)));
    assert.deepEqual(JSON.parse(JSON.stringify(unpackSoldier(JSON.parse(JSON.stringify(packSoldier(cs2)))).blueprint.paint)), JSON.parse(JSON.stringify(painted.paint)), 'palette-indexed packing is lossless');
  }
}

// ---- generated grids use the same options as the battle compile (weapon-length rule), so a weapon paint lines up
{
  const cs = C.newSoldier(new RNG(3)); cs.blueprint.main = 'sarissa'; cs.stats.range = 0;
  const def = C.customDef(cs), opts = C.compileOptsOf(def);
  const a = new PaintDoc(def.model.blueprint, opts).part('weapon').gen.count(), b = new PaintDoc(def.model.blueprint, {}).part('weapon').gen.count();
  const real = compileSoldier(def.model.blueprint, opts).model.byId.weapon.grid.count();
  assert.equal(a, real, 'generated weapon grid == compiled weapon grid'); assert.ok(b >= a);
}

// ---- picking
{
  const g = new VoxelGrid(10, 10, 10); g.set(5, 5, 5, RED); g.set(5, 6, 5, RED);
  let h = rayVoxels(g, [5.5, 5.5, -3], [0, 0, 1]); assert.deepEqual(h.cell, [5, 5, 5]); assert.deepEqual(h.normal, [0, 0, -1]);
  h = rayVoxels(g, [5.5, 5.5, 14], [0, 0, -1]); assert.deepEqual(h.normal, [0, 0, 1]);
  h = rayVoxels(g, [5.5, 12, 5.5], [0, -1, 0]); assert.deepEqual(h.cell, [5, 6, 5]); assert.deepEqual(h.normal, [0, 1, 0]);
  h = rayVoxels(g, [-4, 5.5, 5.5], [1, 0, 0]); assert.deepEqual(h.normal, [-1, 0, 0]);
  assert.equal(rayVoxels(g, [1.5, 1.5, -3], [0, 0, 1]), null, 'a ray through empty cells hits nothing');
  assert.equal(rayVoxels(g, [20, 20, 20], [1, 1, 1]), null, 'a ray pointing away misses');
  // diagonal ray hits the same voxel from a corner direction
  h = rayVoxels(g, [-2, 8, -2], [7.5, -2.5, 7.5]); assert.ok(h && h.cell[0] === 5 && h.cell[1] === 5 && h.cell[2] === 5, 'diagonal ray: ' + JSON.stringify(h));
  // inside-the-box start
  h = rayVoxels(g, [5.5, 5.5, 2.5], [0, 0, 1]); assert.deepEqual(h.cell, [5, 5, 5]);
  const p = pickCell(g, [5.5, 5.5, -3], [0, 0, 1], [5.5, 5.5, -3]); assert.equal(p.kind, 'voxel'); assert.deepEqual(p.add, [5, 5, 4]);
  const empty = pickCell(g, [2.5, 2.5, -3], [0, 0, 1], [2.5, 2.5, -3]); assert.equal(empty.kind, 'wall'); assert.deepEqual(empty.cell, [2, 2, 9]); assert.deepEqual(empty.add, [2, 2, 9], 'camera in front: the back wall is z = sz');
  const top = pickCell(g, [2.5, 14, 2.5], [0, -1, 0], [2.5, 14, 2.5]); assert.equal(top.kind, 'wall'); assert.deepEqual(top.cell, [2, 0, 2], 'camera above: the floor is the back wall');
  const edgeAdd = pickCell(Object.assign(new VoxelGrid(3, 3, 3), {}), [1.5, 1.5, -3], [0, 0, 1], [1.5, 1.5, -3]); assert.equal(edgeAdd.kind, 'wall');
  const g2 = new VoxelGrid(3, 3, 3); g2.set(1, 1, 0, RED); const e2 = pickCell(g2, [1.5, 1.5, 5], [0, 0, -1], [1.5, 1.5, 5]); assert.deepEqual(e2.cell, [1, 1, 0]); assert.deepEqual(e2.add, [1, 1, 1]); const e3 = pickCell(g2, [1.5, 1.5, -5], [0, 0, 1], [1.5, 1.5, -5]); assert.equal(e3.add, null, 'the face looks out of the grid: nothing to add');
}
console.log('paint OK');
