// Results-screen lessons must be TRUE whenever they can be chosen (QA round 1, minor 5: "The archers carried it: 0% of the damage" with no archers,
// "only a quarter of us stood" after a 0-of-1 loss). Plain node:assert; run: node tests/humor/lessons.test.mjs
import assert from 'node:assert';
import { LESSON_TEXT } from '../../src/content/era_ancient/lesson_text.js';
import { generateLessons } from '../../src/sim/lessons.js';

let checks = 0;
const failures = [];
const ok = (cond, msg) => { checks++; if (!cond) failures.push(msg); };
const words = (s) => s.trim().split(/\s+/).length;

const DEFS = { hoplite: { name: 'Hoplite', role: 'melee', cost: 100 }, immortal: { name: 'Immortal', role: 'melee', cost: 120 }, hannibal: { name: 'Hannibal', role: 'hero', cost: 360 }, war_elephant: { name: 'War Elephant', role: 'monster', cost: 728 } };
const spawn = (id, team, def) => ['unit_spawn', { id, team, def, x: 0, z: 0 }, 0];
const end = (winner, t, reason = 'elimination') => ['battle_end', { winner, reason, t }, t];

// ---- the generic ids are padding too: they may use only {t}, never {n}, {pct}, {role}, and never claim who did the damage or how the fight went
const PADDABLE = ['army_low', 'routs', 'composition', 'ranged_win', 'melee_win', 'blitz', 'slog'];
for (const id of PADDABLE) {
  const T = LESSON_TEXT[id];
  ok(T && T.text.length >= 3 && T.fix.length >= 2, id + ' has wordings');
  for (const s of T.text.concat(T.fix)) {
    ok(!/\{(n|pct|role|def|flank)\}/.test(s), `${id} may be padding, so it never prints a made-up number or role: ${s}`);
    ok(!/archer|horse|cavalry|elephant|infantry|flank|\bquarter\b|ran away|routed|broke|blink|carried|did the work|% of/i.test(s.replace(/Counter it: spears for cavalry, cavalry for archers, archers for slow blobs\./, '').replace(/Cavalry on the wings would finish it faster\./, '').replace(/Add a few archers behind the line for more reach\./, '').replace(/Cavalry, siege and heroes end fights\. Budget for one of them\./, '').replace(/More of the same, and keep something fast nearby for the flanks\./, '').replace(/Give one side a reason to move: cavalry, siege or the Advance order\./, '').replace(/Fearless units \(mummies, spartans\) hold when others run\./, '')), `${id} claims nothing about this battle: ${s}`);
  }
}
// ---- slots that exist in each real detector's vars
const ALLOWED = { friendly_fire: ['n'], cavalry_charge: ['n'], brace_win: ['n'], brace_loss: ['n'], army_low: ['t'], flank_fold: ['flank', 't'], hero_down: ['def', 't'], routs: [], stalemate: ['n'], trample: ['n'], ranged_win: [], melee_win: [], blitz: ['t'], slog: ['t'], composition: [] };
for (const [id, T] of Object.entries(LESSON_TEXT)) {
  ok(Array.isArray(T.text) && Array.isArray(T.fix) && T.text.length >= 1 && T.fix.length >= 1, id + ' shape');
  const allowed = ALLOWED[id] || ['t'];
  for (const s of T.text.concat(T.fix)) {
    for (const m of s.matchAll(/\{(\w+)\}/g)) ok(allowed.includes(m[1]), `${id}: slot {${m[1]}} is not in this lesson's vars: ${s}`);
    ok(words(s) <= 24 && !/\n/.test(s), `${id}: short enough for one line (${words(s)}): ${s}`);
    ok(!/\bthe \{def\}/i.test(s), `${id}: a hero is "Hannibal", never "the Hannibal": ${s}`);
  }
}
// ---- the bugs from QA, replayed
const noBadWords = (L) => L.every((l) => !/\b0%|\b0 soldiers|only a quarter|\{|\bundefined\b|NaN/.test(l.text + ' ' + l.fix));
{ // a 1v1 loss
  const log = [spawn(1, 0, 'hoplite'), spawn(2, 1, 'immortal'), ['army_low', { team: 0, frac: 0 }, 17], end(1, 19)];
  const L = generateLessons(log, { team: 0, defs: DEFS });
  ok(L.length === 3 && noBadWords(L), '1v1 loss: ' + L.map((l) => l.text).join(' | '));
  ok(L.every((l) => !/quarter/.test(l.text)), 'a 0-of-1 loss never says a quarter of us stood');
}
{ // a win with no archers on the board, no damage rows at all, no real detector
  const L = generateLessons([spawn(1, 0, 'hoplite'), spawn(2, 1, 'immortal'), end(0, 41)], { team: 0, defs: DEFS });
  ok(L.length === 3 && noBadWords(L) && L.every((l) => !/archer|ranged|shooter/i.test(l.text)), 'a win without archers never credits archers: ' + L.map((l) => l.text).join(' | '));
}
{ // a win whose damage was ranged: the real detector speaks, still without a number it cannot back up
  const log = [spawn(1, 0, 'hoplite'), spawn(2, 1, 'immortal'), ...Array.from({ length: 10 }, () => ['unit_hit', { src: 1, dst: 2, dmg: 10, proj: true }, 16]), end(0, 22)];
  const L = generateLessons(log, { team: 0, defs: DEFS });
  ok(noBadWords(L), 'ranged win: ' + L.map((l) => l.text).join(' | '));
}
{ // a draw (Zeus left): nobody lost, so nobody is told they did... until SIM pads with pad_draw_* (docs/requests/comedy_lessons.md); the text must at least be slot-clean
  const L = generateLessons([spawn(1, 0, 'hoplite'), spawn(2, 1, 'immortal'), ['stalemate_warning', { t: 12 }, 30], end(-1, 60, 'intervention')], { team: 0, defs: DEFS });
  ok(L.length === 3 && noBadWords(L), 'draw: ' + L.map((l) => l.text).join(' | '));
}
{ // the elephant lesson no longer insists on an elephant, and the hero is named without "the"
  const log = [spawn(1, 0, 'hoplite'), spawn(2, 1, 'war_elephant'), ...Array.from({ length: 6 }, () => ['trample', { id: 2, count: 1 }, 20]), ['hero_down', { id: 3, def: 'hannibal', team: 0 }, 25], end(1, 60)];
  const L = generateLessons(log, { team: 0, defs: DEFS });
  const t = L.map((l) => l.text + ' ' + l.fix).join(' | ');
  ok(!/the Hannibal/.test(t) && noBadWords(L), 'hero lesson: ' + t);
  ok(L.filter((l) => l.id === 'trample').every((l) => !/elephant\b.*of ours|the elephant trampled/i.test(l.text)), 'trample lesson does not name the trampler');
}
{ // the dedicated pads exist for SIM to switch to (one per slot of a three-lesson screen, with different fixes)
  for (const kind of ['win', 'loss', 'draw']) {
    const pads = [1, 2, 3].map((i) => LESSON_TEXT['pad_' + kind + '_' + i]);
    ok(pads.every(Boolean), 'pad_' + kind + '_1..3 exist');
    ok(new Set(pads.map((p) => p.fix[0])).size >= 2, 'pad_' + kind + ' fixes differ');
    for (const p of pads) for (const s of p.text.concat(p.fix)) ok(!/\{(?!t\})/.test(s), 'pad text uses only {t}: ' + s);
  }
}
// ---- fills: no unresolved braces for any id and any plausible vars
for (const [id, T] of Object.entries(LESSON_TEXT)) for (const s of T.text.concat(T.fix)) {
  const filled = s.replace(/\{(\w+)\}/g, (m, k) => ({ n: 7, t: '1:23', def: 'Hannibal', flank: 'left' }[k] ?? m));
  ok(!/\{/.test(filled), id + ' fills: ' + s);
}

if (failures.length) { console.error(failures.slice(0, 40).join('\n')); console.error(`lesson tests: ${failures.length} FAILED of ${checks}`); process.exit(1); }
assert.strictEqual(failures.length, 0);
console.log(`lesson tests: ${checks} checks passed`);
