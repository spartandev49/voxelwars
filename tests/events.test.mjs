// D6: ONE event table (core/events.js EVENTS). Every `P.<name>` / emit('<name>') in src/sim must be in it, every emitted payload only uses declared fields,
// and the payload objects are pre-shaped (World.P derives from the table).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { EVENTS, makePayloads } from '../src/core/events.js';
import { buildWorld, sampleGroups } from '../tools/lib/harness.mjs';
import { generateArmy } from '../src/sim/armygen.js';
import { DEFS } from '../tools/lib/harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } })(path.join(root, 'src/sim'));
const used = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bP\.([a-z_]+)\b/g)) used.add(m[1]);
  for (const m of src.matchAll(/emit\('([a-z_]+)'/g)) used.add(m[1]);
}
const missing = [...used].filter((n) => !EVENTS[n]);
assert.deepEqual(missing, [], 'events used in src/sim but missing from EVENTS: ' + missing.join(', '));
// spec §8.2 core payload fields
const spec = { unit_hit: 'src,dst,srcDef,dstDef,dmg,type,crit,backstab,charge,proj,aoe,x,y,z', unit_kill: 'src,dst,srcDef,dstDef,srcTeam,dstTeam,friendly,byPlayer,revived,cause,x,y,z', big_swing: 'team,ratio,flank,cluster', battle_end: 'winner,reason,t,stats,perDef',
  telegraph: 'kind,x,z,r,t', ability_cast: 'id,ability,x,z,team', projectile_launch: 'kind,team,x,y,z,tx,tz,id', unit_corpse_done: 'id,def,team,x,y,z', objective_update: 'id,state,progress', wave_spawn: 'n,count', god_power: 'kind,x,z,team' };
for (const [n, f] of Object.entries(spec)) for (const k of f.split(',')) assert.ok(EVENTS[n].includes(k), n + ' lacks field ' + k);
const P = makePayloads(); for (const n of Object.keys(EVENTS)) assert.deepEqual(Object.keys(P[n]), EVENTS[n], 'payload shape ' + n);

// a chaotic battle: every emitted payload only carries declared fields; and most of the catalogue fires
const army = (seed, style) => generateArmy({ faction: 'mixed', budget: 9000, style, seed, defs: DEFS }).groups;
const w = buildWorld({ arena: 'colosseum', seed: 5, rules: { godPowers: true }, start: false, a: { groups: army(1, 'chaos') }, b: { groups: army(2, 'chaos') } });
const seen = new Set(); let bad = 0;
w.ev.onAny((t, p) => { seen.add(t); const allowed = EVENTS[t]; if (!allowed) { bad++; return; } for (const k of Object.keys(p)) if (!allowed.includes(k)) { bad++; console.log('undeclared field', t, k); } });
w.start();
for (let i = 0; i < 30 * 150 && w.state !== 'ended'; i++) { if (i === 200) w.godpowers.cast('zeus_lightning', 0, 0, 0); if (i === 300) w.godpowers.cast('meteor', 5, 5, 1); w.tick(); }
assert.equal(bad, 0, 'payload fields outside the table');
for (const must of ['unit_spawn', 'unit_hit', 'unit_kill', 'projectile_launch', 'ability_cast', 'telegraph', 'battle_start', 'god_power']) assert.ok(seen.has(must), 'never emitted ' + must);
console.log('events: table covers ' + used.size + ' used events; ' + seen.size + ' of ' + Object.keys(EVENTS).length + ' fired in the chaos battle');
