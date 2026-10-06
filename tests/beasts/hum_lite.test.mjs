// BEASTS: hum_lite crew figure (spec 4.1): body, head, armUL, armUR, legUL, legUR at the canonical hum1 pivots/origins; stands on the ground.
import assert from 'node:assert/strict';
import { buildHumLite } from '../../src/content/era_ancient/beasts/hum_lite.js';
import { modelBounds, teamShare } from '../../src/content/era_ancient/beasts/common.js';

const m = buildHumLite({});
assert.deepEqual(m.parts.map((p) => p.id), ['body', 'head', 'armUL', 'armUR', 'legUL', 'legUR']);
assert.equal(m.meta.rig, 'hum_lite');
// canonical hum1 numbers (spec 4.1): body 10x9x5 pivot (5,0,2.5) at y 10; head 10x10x10 pivot (5,0,5) at +9; arms at +-6.5, 8; legs at +-3, 10
assert.deepEqual([m.byId.body.grid.sx, m.byId.body.grid.sy, m.byId.body.grid.sz], [10, 9, 5]);
assert.deepEqual(m.byId.body.pivot, [5, 0, 2.5]); assert.deepEqual(m.byId.body.originVox, [0, 10, 0]);
assert.deepEqual(m.byId.head.pivot, [5, 0, 5]); assert.deepEqual(m.byId.head.originVox, [0, 9, 0]);
assert.deepEqual(m.byId.armUL.originVox, [6.5, 8, 0]); assert.deepEqual(m.byId.armUR.originVox, [-6.5, 8, 0]);
assert.deepEqual(m.byId.legUL.originVox, [3, 10, 0]); assert.deepEqual(m.byId.legUR.originVox, [-3, 10, 0]);
for (const id of ['armUL', 'armUR', 'legUL', 'legUR']) { const p = m.byId[id]; assert.equal(p.pivot[1], p.grid.sy, `${id} pivots at its top`); }
assert.equal(m.byId.legUL.grid.sy, 10, 'single full-length leg part (no shin)');
// stands on the ground, 2.9 u tall, face cube looks +Z
const b = modelBounds(m);
assert.ok(Math.abs(b.min[1]) < 1e-6 && b.max[1] > 2.85 && b.max[1] < 3.3, `height ${b.max[1]}`);
assert.ok(teamShare(m).mean > 0.2, 'crew tunics carry the team colour');
// with a bow: baked into the right arm, the arm grid gets longer
const a = buildHumLite({ tool: 'bow' });
assert.ok(a.byId.armUR.grid.sz > 20 && a.parts.length === 6);
console.log('beasts hum_lite OK');
