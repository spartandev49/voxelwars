import { Arena, MAT } from '../src/world/arena.js';
import { Noise2D } from '../src/core/rng.js';
import assert from 'node:assert';
const a = new Arena(128); const n = new Noise2D(7);
for (let z = 0; z < 128; z++) for (let x = 0; x < 128; x++) { a.setH(x, z, 20 + n.fbm(x / 30, z / 30, 4) * 12); a.setM(x, z, x > 64 ? MAT.sand : MAT.grass); }
a.props.push({ t: 'tree_oak', x: 1.5, z: -3.25, r: 1, s: 1.2, v: 2 });
a.crater(0, 0, 3, 4);
const j = JSON.parse(JSON.stringify(a.toJSON()));
const b = Arena.fromJSON(j);
assert.deepEqual(Array.from(b.h), Array.from(a.h)); assert.deepEqual(Array.from(b.m), Array.from(a.m));
assert.equal(b.props.length, 1);
assert.throws(() => Arena.fromJSON({ size: 100 }));
assert.throws(() => Arena.fromJSON({ size: 128, h: [5, 1], m: [5, 1] }));
console.log('arena OK; json bytes', JSON.stringify(j).length, 'height@0,0', a.heightAt(0,0));
