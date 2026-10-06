// W6 / S21 feasibility gate: the win-rate bands of the scripted reference players are STORED (tests/campaign/feasibility.json, written by
// `node tests/campaign/run_feasibility.mjs --report` after the long run) and this fast test checks them against the CURRENT mission data:
//   - every mission has a record for counter (>= 20 seeds), greedy (>= 20) and turtle (>= 10) made on the same data (hash match; a changed mission fails
//     here until the feasibility run is repeated),
//   - counter wins 60-90% (a reference deployment wins >= 60%), greedy 25-70% (the naive deployment wins <= 70%), turtle 10-60%,
//   - star 3 is reachable (some recorded battle earned it) for every mission, and the thrifty bot proves star 3 of mission 1,
//   - one stored battle is replayed now and must reproduce exactly (the sim is deterministic: an unrecorded sim change shows up here).
// docs/campaign_report.md is generated from the same file.
import fs from 'node:fs';
import { test, finish, assert } from '../sim/_util.mjs';
import { MISSIONS, missionHash } from '../../src/content/era_ancient/campaign.js';
import { runMission, botGroups } from './_lib.mjs';

const rec = JSON.parse(fs.readFileSync(new URL('./feasibility.json', import.meta.url), 'utf8'));
const MIN = { counter: 20, greedy: 20, turtle: 10 };

await test('records exist for every mission and bot, made on the current mission data (hash), with enough seeds', () => {
  for (const m of MISSIONS) {
    const r = rec.runs[m.id]; assert.ok(r, m.id + ' has no feasibility record');
    assert.equal(r.hash, missionHash(m), m.id + ' data changed since the feasibility run: re-run tests/campaign/run_feasibility.mjs');
    for (const bot of Object.keys(MIN)) { const b = r.bots[bot]; assert.ok(b, m.id + ' ' + bot + ' missing'); assert.ok(b.n >= MIN[bot], m.id + ' ' + bot + ' ran ' + b.n + ' seeds, needs ' + MIN[bot]); assert.equal(b.hash, r.hash, m.id + ' ' + bot + ' was run on other data'); assert.equal(b.perSeed.length, b.n); }
  }
});

await test('bands: counter 60-90%, greedy 25-70%, turtle 10-60% on every mission (the reference deployment wins, the naive one does not walk it, the counter-pick pays off)', () => {
  const bad = [];
  for (const m of MISSIONS) for (const bot of ['counter', 'greedy', 'turtle']) {
    const b = rec.runs[m.id].bots[bot], [lo, hi] = m.bots[bot];
    if (!(b.rate >= lo - 1e-9 && b.rate <= hi + 1e-9)) bad.push(m.id + ' ' + bot + ' ' + Math.round(b.rate * 100) + '% not in ' + Math.round(lo * 100) + '-' + Math.round(hi * 100));
    assert.equal(b.wins, b.perSeed.filter((s) => s[0]).length, 'stored wins match the per-seed list');
  }
  assert.deepEqual(bad, []);
  for (const m of MISSIONS) assert.ok(rec.runs[m.id].bots.counter.rate > rec.runs[m.id].bots.greedy.rate - 0.2, m.id + ': the counter-pick should not lose to the naive deployment by a margin');
});

await test('stars: every mission\'s star 3 was earned by at least one recorded battle (it is reachable), star 2 by at least one on most missions; mission 1\'s thrift star by the thrifty bot', () => {
  let two = 0;
  for (const m of MISSIONS) {
    const bots = rec.runs[m.id].bots; let s3 = 0, s2 = 0;
    for (const k of Object.keys(bots)) { s3 += bots[k].starHits[2]; s2 += bots[k].starHits[1]; }
    assert.ok(s3 >= 1, m.id + ' star 3 never earned in ' + Object.keys(bots).map((k) => bots[k].n).join('+') + ' battles'); if (s2 >= 1) two++;
  }
  assert.ok(two >= 8, 'star 2 reachable on ' + two + ' of 9 missions');
  const th = rec.runs.marathon_sort_of.bots.thrifty; assert.ok(th && th.starHits[2] >= 1, 'a thrifty army (<= 2,250) wins mission 1 and earns the thrift star');
});

await test('determinism: the first stored battle of mission 1 (counter, seed 1) replays to the same result and time', () => {
  const m = MISSIONS[0], b = rec.runs[m.id].bots.counter, r = runMission(m, 'counter', 1);
  assert.equal(r.win ? 1 : 0, b.perSeed[0][0], 'win/loss reproduces'); assert.ok(Math.abs(r.t - b.perSeed[0][1]) < 0.2, 'end time reproduces: ' + r.t.toFixed(1) + ' vs ' + b.perSeed[0][1]); assert.equal(r.stars, b.perSeed[0][2]);
});

await test('briefing numbers: units.A is what the reference deployment fields (within 15%), units.B counts every enemy unit of the mission (placed army + waves)', () => {
  for (const m of MISSIONS) {
    const n = [1, 2, 3, 4, 5].map((s) => botGroups(m, 'counter', s).reduce((a, g) => a + g.n, 0)), avg = n.reduce((a, b) => a + b, 0) / n.length;
    assert.ok(Math.abs(avg - m.units.A) <= 0.15 * avg, m.id + ' units.A ' + m.units.A + ' vs reference ' + avg.toFixed(1));
    const all = (m.enemy.groups || []).concat(...((m.script && m.script.waves) ? m.script.waves.list.map((w) => w.groups) : [])); assert.equal(m.units.B, all.reduce((a, g) => a + g.n, 0), m.id + ' units.B');
  }
});

finish('feasibility');
