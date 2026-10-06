// E4 (parts): every part category visibly switches the model - swapping any registered part for 'none' changes the compiled voxels,
// each category contributes parts, and all swaps compile within the U2 limits.
import assert from 'node:assert/strict';
import { compileSoldier, defaultBlueprint, PART_REGISTRY } from '../../src/content/era_ancient/blueprints.js';

const hashModel = (m) => { let h = 2166136261; for (const p of m.parts) { h = Math.imul(h ^ (p.id.charCodeAt(0) + p.id.length), 16777619) >>> 0; for (let i = 0; i < p.grid.d.length; i++) h = Math.imul(h ^ p.grid.d[i], 16777619) >>> 0; h = Math.imul(h ^ Math.round(p.rest[0] * 1000), 16777619) >>> 0; } return h; };
const base = Object.assign(defaultBlueprint(), {
  id: 'swap_base', head: { helm: 'none', hair: 'bald', face: 'none', eyes: '#222222' }, torso: { armor: 'none', tunic: 'none' }, legs: { armor: 'bare', skirt: 'none' },
  shoulders: 'none', cape: 'none', back: 'none', main: 'none', off: 'none', emblem: 'lambda',
});
const SLOT = { helms: ['head', 'helm'], hair: ['head', 'hair'], faces: ['head', 'face'], armors: ['torso', 'armor'], tunics: ['torso', 'tunic'], legs: ['legs', 'armor'], skirts: ['legs', 'skirt'], shoulders: [null, 'shoulders'], capes: [null, 'cape'], backs: [null, 'back'], mains: [null, 'main'], offs: [null, 'off'] };
const h0 = hashModel(compileSoldier(base).model);
const unchanged = [];
let n = 0;
for (const cat of Object.keys(SLOT)) {
  let changed = 0;
  for (const id of Object.keys(PART_REGISTRY[cat])) {
    if (id === 'none' || id === 'bald' || id === 'bare') continue;
    const bp = JSON.parse(JSON.stringify(base)); bp.id = 'swap_' + cat;
    const [g, k] = SLOT[cat];
    if (g) bp[g][k] = id; else bp[k] = id;
    const c = compileSoldier(bp);
    assert.ok(c.parts <= 24 && c.voxels >= 600, `${cat}.${id}`);
    if (hashModel(c.model) === h0) unchanged.push(`${cat}.${id}`); else changed++;
    n++;
  }
  assert.ok(changed > 0, `category ${cat} never changes the model`);
}
assert.deepEqual(unchanged, [], 'parts that do not change the model: ' + unchanged.join(', '));
console.log(`swap.test OK: ${n} part swaps all change the compiled model`);
