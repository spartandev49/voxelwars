// U3: every shipped humanoid carries >= 30% team-tinted visible surface (pooled front/back/side projections, in the rest AND the ready pose),
// plus a negative control (strip the tint voxels from a unit and the check must fail), and projection sanity checks.
import assert from 'node:assert/strict';
import { tintReport, projectModel, loadUnits, optsFor, MIN_POOLED, MIN_VIEW } from '../../tools/tintcheck.mjs';
import { compileSoldier, PART_REGISTRY, defaultBlueprint } from '../../src/content/era_ancient/blueprints.js';

const units = await loadUnits();
const ids = Object.keys(units);
assert.ok(ids.length >= 9);
const rows = [];
for (const id of ids) {
  const spec = units[id], bp = spec.blueprint || spec.rider;
  const r = tintReport(bp, optsFor(id));
  rows.push(`${id} ${(r.tint.pooled * 100).toFixed(0)}/${(r.tintRest.pooled * 100).toFixed(0)}%`);
  assert.ok(r.tint.pooled >= MIN_POOLED, `${id}: ready-pose tint ${(r.tint.pooled * 100).toFixed(1)}% < ${MIN_POOLED * 100}%`);
  assert.ok(r.tintRest.pooled >= MIN_POOLED, `${id}: rest-pose tint ${(r.tintRest.pooled * 100).toFixed(1)}% < ${MIN_POOLED * 100}%`);
  for (const k of ['front', 'back', 'side']) { assert.ok(r.tint[k] >= MIN_VIEW, `${id}: ${k} view ${(r.tint[k] * 100).toFixed(1)}%`); assert.ok(r.tintRest[k] >= MIN_VIEW, `${id}: rest ${k} view`); }
  assert.ok(r.pass, id);
}

// negative control: recolour every F_TEAM voxel to a plain colour => the unit must fail the check
{
  const bp = JSON.parse(JSON.stringify(units.hoplite.blueprint));
  const c = compileSoldier(bp, optsFor('hoplite'));
  let team = 0;
  for (const p of c.model.parts) for (let i = 0; i < p.grid.d.length; i++) { const v = p.grid.d[i]; if (v && ((v >>> 24) & 2)) { p.grid.d[i] = (v & ~(2 << 24)) >>> 0; team++; } }
  assert.ok(team > 100, 'hoplite has team voxels');
  const pr = projectModel(c.model, null);
  const tinted = pr.front.tinted + pr.back.tinted + pr.left.tinted + pr.right.tinted;
  assert.equal(tinted, 0, 'negative control: no tint left after stripping F_TEAM');
}
// projection sanity: a solid 10x9x5 body block covers the expected pixel area from the front (10 voxels * 9 voxels * 4 px^2 per voxel)
{
  const bp = Object.assign(defaultBlueprint(), { head: { helm: 'none', hair: 'bald', face: 'none', eyes: '#222222' }, torso: { armor: 'none', tunic: 'none' }, legs: { armor: 'bare', skirt: 'none' }, main: 'none', off: 'none' });
  const c = compileSoldier(bp);
  const pr = projectModel(c.model, null);
  assert.ok(pr.front.covered > 1000 && pr.front.covered < 2200, 'front coverage ' + pr.front.covered);
  assert.equal(pr.front.tinted, 0, 'a bare soldier has no team tint');
}
console.log('tint.test OK: ' + rows.join(', '));
