// Repetition simulation (H2, H8): 60 simulated minutes at 1x and 4x through the announcer, several seeds. Run: node tests/humor/sim.test.mjs
import assert from 'node:assert';
import { runSimulation, formatReport, recordedLogs, SCRIPT_KINDS } from '../../tools/humor-sim.mjs';
import { CATEGORIES } from '../../src/content/era_ancient/humor/announcer.js';

let checks = 0;
const failures = [];
const ok = (cond, msg) => { checks++; if (!cond) failures.push(msg); };

ok(recordedLogs(1).length === 10 && SCRIPT_KINDS.length === 10, '10 recorded event logs');
ok(recordedLogs(1).every((l) => l.events.length > 10 && l.events[0].type === 'battle_start' && l.events[l.events.length - 1].type === 'battle_end'), 'logs are complete battles');
ok(JSON.stringify(recordedLogs(5)) === JSON.stringify(recordedLogs(5)), 'logs are deterministic');

const SEEDS = [7, 11, 23];
for (const seed of SEEDS) {
  const r = runSimulation({ minutes: 60, speed: 1, seed });
  const m = r.metrics, tag = `1x seed ${seed}: `;
  ok(m.total >= 250, tag + 'enough lines in an hour: ' + m.total);
  ok(m.repeatRate5 < 0.08, tag + `repeats within 5 min ${(m.repeatRate5 * 100).toFixed(1)}% (< 8%)`);
  ok(m.maxShare <= 0.04, tag + `top line share ${(m.maxShare * 100).toFixed(2)}% (<= 4%) ${m.topLines[0].id}`);
  ok(m.categories.missing.length === 0, tag + 'every category hit; missing: ' + m.categories.missing.join(','));
  for (const [k, s] of Object.entries(m.voiceShare)) ok(s >= 0.25 && s <= 0.45, tag + `${k} share ${(s * 100).toFixed(1)}% (25-45%)`);
  ok(m.linesPerBattle.mean >= 8 && m.linesPerBattle.mean <= 15, tag + 'lines per battle 8-15: ' + m.linesPerBattle.mean.toFixed(1));
  ok(m.inBattleSecondsPerLine >= 6 && m.inBattleSecondsPerLine <= 10, tag + `about one line per 8 s in battle: ${m.inBattleSecondsPerLine.toFixed(1)} s`);
  ok(m.violations.gap === 0 && m.violations.sameVoice === 0 && m.violations.chainBeat === 0 && m.violations.recency === 0, tag + 'rule violations ' + JSON.stringify(m.violations));
  ok(m.gap.min >= 1.5 - 1e-6, tag + 'min gap ' + m.gap.min.toFixed(2));
  ok(m.chains >= 5, tag + 'chains play: ' + m.chains);
  ok(m.distinctLines >= 120, tag + 'distinct templates heard in an hour: ' + m.distinctLines);
}
// the same targets with brand new random battles instead of replayed logs, and for a first-time player (no callbacks)
{
  const r = runSimulation({ minutes: 60, speed: 1, seed: 31, fresh: true });
  ok(r.metrics.repeatRate5 < 0.08 && r.metrics.maxShare <= 0.04, 'fresh scripts: repeats and histogram');
  ok(r.metrics.categories.missing.length <= 2, 'fresh scripts: coverage ' + r.metrics.categories.missing.join(','));
  const n = runSimulation({ minutes: 60, speed: 1, seed: 7, stats: 'novice' });
  ok(n.metrics.repeatRate5 < 0.08 && n.metrics.maxShare <= 0.04 && n.metrics.categories.missing.length === 0, 'novice profile: ' + n.metrics.categories.missing.join(','));
}
// 20 simulated minutes, the original H2 wording
{
  const r = runSimulation({ minutes: 20, speed: 1, seed: 3 });
  ok(r.metrics.repeatRate5 < 0.08, '20 min: repeats within 5 min < 8%: ' + (r.metrics.repeatRate5 * 100).toFixed(1));
}
// 4x: only priority >= 4 speaks; targets still hold; most reachable categories are heard
for (const seed of SEEDS) {
  const r = runSimulation({ minutes: 60, speed: 4, seed });
  const m = r.metrics, tag = `4x seed ${seed}: `;
  ok(m.violations.lowPriorityAtFast === 0, tag + 'no low-priority lines at 4x');
  ok(m.violations.gap === 0 && m.violations.sameVoice === 0 && m.violations.chainBeat === 0 && m.violations.recency === 0, tag + 'rule violations ' + JSON.stringify(m.violations));
  ok(m.repeatRate5 < 0.08, tag + 'repeats ' + (m.repeatRate5 * 100).toFixed(1) + '%');
  ok(m.maxShare <= 0.04, tag + `top line share ${(m.maxShare * 100).toFixed(2)}% ${m.topLines[0].id}`);
  ok(m.categories.hit / m.categories.total >= 0.88, tag + `categories ${m.categories.hit}/${m.categories.total} missing ${m.categories.missing.join(',')}`);
  for (const [k, s] of Object.entries(m.voiceShare)) ok(s >= 0.25 && s <= 0.45, tag + `${k} share ${(s * 100).toFixed(1)}%`);
}
// every announcer category is reachable somewhere in the generator (guards against dead lines)
{
  const r = runSimulation({ minutes: 120, speed: 1, seed: 5 });
  ok(CATEGORIES.every((c) => r.lines.some((l) => l.cat === c)), 'two hours of play hit all ' + CATEGORIES.length + ' categories; missing ' + r.metrics.categories.missing.join(','));
  console.log(formatReport(runSimulation({ minutes: 60, speed: 1, seed: 7 })));
}

if (failures.length) { console.error(failures.slice(0, 60).join('\n')); console.error(`humor sim tests: ${failures.length} FAILED of ${checks}`); process.exit(1); }
assert.strictEqual(failures.length, 0);
console.log(`humor sim tests: ${checks} checks passed`);
