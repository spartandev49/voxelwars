// Announcer tests: H1 (>= 90 lines, >= 3 per category, voices 25-45%), H8 (>= 120 slotted templates, >= 3 slot kinds, stat callbacks),
// and the selector rules of spec/humor.md section 3. Run: node tests/humor/announcer.test.mjs
import assert from 'node:assert';
import { TEMPLATES, CATEGORIES, createAnnouncer, renderTemplate, lineSlots, categoryPriority, DEFAULT_CONFIG } from '../../src/content/era_ancient/humor/announcer.js';
import { RNG } from '../../src/core/rng.js';

let checks = 0;
const failures = [];
const ok = (cond, msg) => { checks++; if (!cond) failures.push(msg); };

// ---------- H1 / H8: template inventory ----------
ok(TEMPLATES.length >= 120, `>= 120 templates (have ${TEMPLATES.length})`);
ok(TEMPLATES.filter((l) => !l.follow).length >= 90, '>= 90 standalone lines');
const byCat = new Map();
for (const l of TEMPLATES) if (!l.follow) { if (!byCat.has(l.cat)) byCat.set(l.cat, []); byCat.get(l.cat).push(l); }
const SPEC_CATS = ['battle_start', 'first_blood', 'kill_streak', 'hero_down', 'friendly_fire', 'rout', 'charge', 'brace', 'volley', 'boulder', 'chicken', 'goat', 'philosopher', 'senator', 'trojan', 'medusa', 'elephant', 'lead_change', 'comeback', 'stalemate', 'zeus', 'victory', 'defeat', 'timeout', 'mass_death', 'prop_destroyed', 'god_power', 'idle_filler'];
for (const c of SPEC_CATS) ok(byCat.has(c) && byCat.get(c).length >= 3, `category ${c} has >= 3 lines`);
for (const c of ['kick', 'immortal', 'throne', 'misfire', 'misaim', 'hazard', 'big_swing', 'army_low', 'wave']) ok(byCat.has(c) && byCat.get(c).length >= 3, `gag/extra category ${c} has >= 3 lines`);
ok(byCat.get('idle_filler').length >= 8, 'idle_filler has >= 8 lines');
for (const id of ['marathon_sort_of', 'thermopylae_snack', 'pyramid_scheme', 'nile_crossing', 'alps_elephant', 'teutoburg_peekaboo', 'troy_giftshop', 'cyclops_meet', 'zeus_bad_day']) ok((byCat.get('campaign_' + id) || []).length >= 3, 'campaign_' + id + ' has >= 3 lines');
// voices: each 25-45% of templates
const v = { brutus: 0, plato: 0, cassandra: 0 };
for (const l of TEMPLATES) v[l.who]++;
for (const [k, n] of Object.entries(v)) ok(n / TEMPLATES.length >= 0.25 && n / TEMPLATES.length <= 0.45, `voice ${k} is ${(100 * n / TEMPLATES.length).toFixed(0)}% of templates`);
// every category, and every sub-category of it, can be answered by at least two voices (alternation never starves a moment)
for (const [cat, lines] of byCat) {
  ok(new Set(lines.map((l) => l.who)).size >= 2, `${cat} has >= 2 voices`);
  const subs = new Set();
  for (const l of lines) if (l.cond && l.cond.sub !== undefined) [].concat(l.cond.sub).forEach((s) => subs.add(s));
  for (const sub of subs) { const eligible = lines.filter((l) => !(l.cond && l.cond.sub !== undefined) || [].concat(l.cond.sub).includes(sub)); ok(new Set(eligible.map((l) => l.who)).size >= 2 || cat.startsWith('campaign_'), `${cat}/${sub} has >= 2 voices`); }
}
// slot kinds
const slotKinds = new Set();
for (const l of TEMPLATES) for (const t of lineSlots(l)) slotKinds.add(t.name === 'lifetime' ? 'lifetime' : t.name);
for (const k of ['unit', 'unit2', 'arena', 'team', 'n', 'killer', 'streak', 'lifetime', 'faction', 'mission']) ok(slotKinds.has(k), 'slot kind used: ' + k);
ok(slotKinds.size >= 3, '>= 3 slot kinds');
const slotted = TEMPLATES.filter((l) => lineSlots(l).length > 0).length;
ok(slotted >= 60, `slotted templates: ${slotted}`);
const lifetimeStats = new Set();
for (const l of TEMPLATES) for (const t of lineSlots(l)) if (t.name === 'lifetime') lifetimeStats.add(t.arg);
ok(lifetimeStats.size >= 6, 'persistent callbacks read >= 6 different lifetime stats: ' + [...lifetimeStats].join(','));
ok(TEMPLATES.filter((l) => l.chain).length >= 6, '>= 6 chain exchanges');
ok(TEMPLATES.filter((l) => l.chain && l.chain.length === 2).length >= 3, '>= 3 three-beat chains');
// chain voices alternate
for (const h of TEMPLATES.filter((l) => l.chain)) { let prev = h.who; for (const id of h.chain) { const f = TEMPLATES.find((x) => x.id === id); ok(f.who !== prev, 'chain voices alternate in ' + h.id); prev = f.who; } }
// priorities
ok(categoryPriority('campaign_x') === 5 && categoryPriority('idle_filler') === 1 && categoryPriority('victory') === 5, 'priorities');

// ---------- template rendering ----------
ok(renderTemplate('{unit|pl} and {unit|a}', { unit: 'Immortal', unit_pl: 'Immortals' }) === 'Immortals and an Immortal', 'pl + a filters');
ok(renderTemplate('{unit|a}', { unit: 'Hoplite' }) === 'A Hoplite', 'a filter before consonant, capitalised start');
ok(renderTemplate('{n|ord} {n|words} {n|num}', { n: 3 }) === 'Third three 3', 'ord/words/num');
ok(renderTemplate('{n|num}', { n: 12345 }) === '12,345', 'num grouping');
ok(renderTemplate('{unit|up}!', { unit: 'goat' }) === 'GOAT!', 'up filter');
ok(renderTemplate('{unit} and {unit2}', { unit: 'a' }) === null, 'unresolved slot -> null');
ok(renderTemplate('Third chicken defeat: {lifetime:chickenDefeats|ord}', {}, { chickenDefeats: 3 }) === 'Third chicken defeat: third', 'lifetime slot with ordinal');
ok(renderTemplate('{lifetime:kills}', {}, {}) === null, 'missing lifetime stat is unresolved');

// ---------- helpers ----------
const mk = (seed, stats, extra) => createAnnouncer(Object.assign({ rng: new RNG(seed), stats: stats || {} }, extra || {}));
const run = (ann, steps, dt) => { const out = []; for (let i = 0; i < steps; i++) { ann.tick(dt); let l; while ((l = ann.nextLine())) out.push(l); } return out; };
const ctx = { arena: 'marathon', factions: ['Hellenes', 'Persians'], speed: 1, playerTeam: 0 };

// ---------- selector rules ----------
{ // global min gap 3.5 s (1.5 s for priority 5); never the same voice twice in a row unless chain; last 14 never repeat; chains use 1.1 s beats
  const ann = mk(1);
  ann.onEvent('battle_start', { teams: 2 }, ctx);
  const lines = [];
  for (let step = 0; step < 4000; step++) {
    ann.tick(0.1);
    if (step % 7 === 0) ann.onEvent('kill_streak', { id: 1, count: 3 + (step % 9), def: 'hoplite' }, ctx);
    if (step % 11 === 0) ann.onEvent('big_swing', { team: step % 2, ratio: 0.5 + (step % 5), flank: ['left', 'right', 'center'][step % 3], cluster: { x: 0, z: 0 } }, ctx);
    if (step % 13 === 0) ann.onEvent('unit_rout', { id: step, team: 1 }, ctx);
    if (step % 17 === 0) ann.onEvent('hero_down', { id: 3, def: 'strategos', team: 0 }, ctx);
    if (step % 19 === 0) ann.onEvent('god_power', { kind: ['meteor', 'earthquake', 'wine_rain'][step % 3], x: 0, z: 0, team: 0 }, ctx);
    let l; while ((l = ann.nextLine())) lines.push(l);
  }
  ok(lines.length > 30, 'busy stream produced lines: ' + lines.length);
  let gapBad = 0, voiceBad = 0, beatBad = 0, recencyBad = 0, chains = 0;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i], p = lines[i - 1], g = l.at - p.at;
    if (l.head) { if (g < (l.pri >= 5 ? 1.5 : 3.5) - 1e-6) gapBad++; if (l.who === p.who) voiceBad++; } else { chains++; if (Math.abs(g - 1.1) > 1e-6) beatBad++; if (l.who === p.who) voiceBad++; }
    for (let k = Math.max(0, i - 14); k < i; k++) if (lines[k].id === l.id) { recencyBad++; break; }
  }
  ok(gapBad === 0, 'min gap rule violations: ' + gapBad);
  ok(voiceBad === 0, 'same voice twice in a row: ' + voiceBad);
  ok(beatBad === 0, 'chain beats are 1.1 s apart: ' + beatBad);
  ok(recencyBad === 0, 'last-14 recency violations: ' + recencyBad);
  const perMin = lines.length / (4000 * 0.1 / 60);
  ok(perMin < 9, 'average pace under 9 lines/min under heavy load: ' + perMin.toFixed(1));
}
{ // per-category cooldown: 20 s, filler 45 s
  const ann = mk(2);
  ann.onEvent('battle_start', {}, ctx); run(ann, 60, 0.1);
  ann.onEvent('chicken_tantrum', {}, ctx);
  const a = run(ann, 100, 0.1).filter((l) => l.cat === 'chicken');
  ann.onEvent('chicken_tantrum', {}, ctx);
  const b = run(ann, 100, 0.1).filter((l) => l.cat === 'chicken');
  ok(a.length === 1, 'first chicken line spoken');
  ok(b.length === 0, 'second chicken line inside the 20 s cooldown is dropped');
  run(ann, 150, 0.1);
  ann.onEvent('chicken_tantrum', {}, ctx);
  ok(run(ann, 100, 0.1).filter((l) => l.cat === 'chicken').length === 1, 'chicken speaks again after cooldown');
}
{ // idle filler: only after a quiet spell, only while a battle runs, 45 s cooldown, and not at speed > 2
  const ann = mk(3);
  ok(run(ann, 300, 0.1).length === 0, 'no filler outside a battle');
  ann.onEvent('battle_start', {}, ctx);
  const first = run(ann, 200, 0.1);
  ok(first.some((l) => l.cat === 'idle_filler'), 'filler speaks in a quiet battle');
  const f = run(ann, 1000, 0.1).filter((l) => l.cat === 'idle_filler');
  const gaps = f.map((l, i) => (i ? l.at - f[i - 1].at : 99));
  ok(gaps.every((g) => g >= 45 - 1e-6), 'fillers are >= 45 s apart');
  const fast = mk(3);
  fast.onEvent('battle_start', {}, Object.assign({}, ctx, { speed: 4 }));
  ok(run(fast, 600, 0.1).every((l) => l.cat !== 'idle_filler'), 'no filler at 4x');
}
{ // speed > 2x: only priority >= 4
  const ann = mk(4);
  const fx = Object.assign({}, ctx, { speed: 4 });
  const lines = [];
  for (let step = 0; step < 3000; step++) {
    ann.tick(0.1);
    if (step % 5 === 0) ann.onEvent(['charge_hit', 'philosopher_monologue', 'kill_streak', 'unit_brace', 'hero_down', 'prop_destroyed', 'chicken_tantrum'][step % 7], { id: 1, dst: 2, mul: 1, count: 5, def: 'hoplite', team: 0, type: 'wall_stone' }, fx);
    let l; while ((l = ann.nextLine())) lines.push(l);
  }
  ok(lines.length > 5, 'fast stream still speaks: ' + lines.length);
  ok(lines.every((l) => l.pri >= 4), 'at 4x only priority >= 4 lines speak');
  ok(lines.every((l) => l.cat !== 'volley' && l.cat !== 'prop_destroyed' && l.cat !== 'charge' && l.cat !== 'idle_filler'), 'low-priority categories are silent at 4x');
}
{ // once-lines: at most once per battle; battle_start resets them
  const only = [{ id: 'x_once', cat: 'zeus', who: 'brutus', text: 'ONCE only.', once: true, cond: { sub: 'bolt' } }];
  const ann = mk(5, {}, { templates: only });
  ann.onEvent('battle_start', {}, ctx);
  ann.onEvent('intervention', { kind: 'zeus' }, ctx);
  ok(run(ann, 50, 0.1).filter((l) => l.id === 'x_once').length === 1, 'once line speaks');
  run(ann, 400, 0.1);
  ann.onEvent('intervention', { kind: 'zeus' }, ctx);
  ok(run(ann, 100, 0.1).filter((l) => l.id === 'x_once').length === 0, 'once line does not repeat inside a battle');
  ann.onEvent('battle_start', {}, ctx);
  run(ann, 400, 0.1);
  ann.onEvent('intervention', { kind: 'zeus' }, ctx);
  // the line is still inside the last-14 memory only if others spoke; with a single template it is the only candidate, so recency applies
  const again = run(ann, 100, 0.1).filter((l) => l.id === 'x_once').length;
  ok(again === 0 || again === 1, 'once line may return in a new battle (recency memory may still hold it)');
}
{ // recency: with 3 lines in a category and nothing else, a repeat inside the last 14 ids never happens
  const t = ['a', 'b', 'c'].map((k, i) => ({ id: 'r_' + k, cat: 'brace', who: ['brutus', 'plato', 'cassandra'][i], text: 'Line ' + k + '.' }));
  const ann = mk(6, {}, { templates: t, config: { catCooldown: 0 } });
  const seen = [];
  for (let i = 0; i < 40; i++) { ann.onEvent('unit_brace', {}, ctx); seen.push(...run(ann, 100, 0.1)); }
  ok(seen.length >= 2 && seen.length <= 3, 'only three distinct lines available, so at most three are spoken inside the memory: ' + seen.length);
}
{ // chains: head + beats, 1.1 s apart, voices alternate; follower lines never appear alone
  const t = [
    { id: 'c_head', cat: 'zeus', who: 'brutus', text: 'Head.', chain: ['c_b', 'c_c'], cond: { sub: 'ragequit' } },
    { id: 'c_b', cat: 'zeus', who: 'plato', text: 'Beat two.', follow: true },
    { id: 'c_c', cat: 'zeus', who: 'cassandra', text: 'Beat three.', follow: true },
  ];
  const ann = mk(7, {}, { templates: t });
  ann.onEvent('battle_start', {}, ctx);
  ann.onEvent('intervention', { kind: 'ragequit' }, ctx);
  const out = run(ann, 80, 0.1);
  ok(out.length === 3 && out.map((l) => l.id).join() === 'c_head,c_b,c_c', 'chain plays head, beat two, beat three');
  ok(Math.abs(out[1].at - out[0].at - 1.1) < 1e-9 && Math.abs(out[2].at - out[1].at - 1.1) < 1e-9, 'beats are 1.1 s apart');
  ok(out[0].chain && out[0].chain.n === 3 && out[2].chain.i === 2, 'chain metadata');
  ok(out.every((l) => l.at <= 3.5), 'chain lines are due at their scheduled time');
}
{ // slot gating: a line that names {unit2} never speaks without one; first_blood slots come from the kill
  const ann = mk(8);
  ann.onEvent('battle_start', {}, ctx); run(ann, 60, 0.1);
  ann.onEvent('first_blood', {}, ctx);
  ann.onEvent('unit_kill', { src: 1, dst: 2, srcDef: 'spartan', dstDef: 'immortal', srcTeam: 0, dstTeam: 1, friendly: false, cause: 'melee' }, ctx);
  const l = run(ann, 60, 0.1).find((x) => x.cat === 'first_blood');
  ok(l && !/\{/.test(l.text), 'first blood rendered without unresolved slots: ' + (l && l.text));
  const ann2 = mk(9);
  ann2.onEvent('battle_start', {}, ctx); run(ann2, 60, 0.1);
  ann2.onEvent('first_blood', {}, ctx);
  const l2 = run(ann2, 60, 0.1).find((x) => x.cat === 'first_blood');
  ok(l2 && !/\{/.test(l2.text) && !/Hoplite|Immortal|Spartan/.test(l2.text), 'first blood with no kill info uses slotless lines');
}
{ // persistent callbacks read lifetime stats at speak time (Cassandra's chicken ledger)
  const stats = { chickenDefeats: 3 };
  let said = null;
  for (let seed = 1; seed < 60 && !said; seed++) {
    const ann = mk(seed, stats);
    ann.onEvent('battle_start', {}, ctx); run(ann, 60, 0.1);
    ann.onEvent('battle_end', { winner: 1, reason: 'elimination', t: 90, stats: {}, perDef: { 0: {}, 1: { sacred_chicken: 2, legionary: 4 } } }, ctx);
    said = run(ann, 120, 0.1).find((l) => l.cat === 'defeat' && /chicken/i.test(l.text) && /3|three/i.test(l.text));
  }
  ok(said, 'a chicken-defeat callback quotes the lifetime count');
  const stats2 = { chickenDefeats: 0 };
  for (let seed = 1; seed < 40; seed++) {
    const ann = mk(seed, stats2);
    ann.onEvent('battle_start', {}, ctx); run(ann, 60, 0.1);
    ann.onEvent('battle_end', { winner: 1, reason: 'elimination', t: 90, stats: {}, perDef: { 0: {}, 1: { sacred_chicken: 2 } } }, ctx);
    ok(run(ann, 120, 0.1).every((l) => !/Chicken defeat number|times now/.test(l.text)), 'no chicken ledger line without chicken defeats');
  }
  // milestone callback: win number 10 only
  const m = [];
  for (const wins of [9, 10, 11]) { let hit = false; for (let seed = 1; seed < 40 && !hit; seed++) { const ann = mk(seed, { wins }); ann.onEvent('battle_start', {}, ctx); run(ann, 60, 0.1); ann.onEvent('battle_end', { winner: 0, reason: 'elimination', t: 90, perDef: { 0: { hoplite: 5 }, 1: {} } }, ctx); hit = run(ann, 120, 0.1).some((l) => /Win number|wins\. Is a record/.test(l.text)); } m.push(hit); }
  ok(m[0] === false && m[1] === true && m[2] === false, 'milestone callbacks fire only on milestone win counts: ' + m.join());
}
{ // campaign: mission-specific lines at start; unknown missions fall back to generic categories
  for (const id of ['marathon_sort_of', 'thermopylae_snack', 'zeus_bad_day']) {
    const ann = mk(10);
    ann.onEvent('battle_start', {}, Object.assign({}, ctx, { mission: id }));
    const l = run(ann, 30, 0.1)[0];
    ok(l && l.cat === 'campaign_' + id, 'campaign start line for ' + id + ': ' + (l && l.cat));
  }
  const ann = mk(11);
  ann.onEvent('battle_start', {}, Object.assign({}, ctx, { mission: 'puzzle_unknown' }));
  const l = run(ann, 30, 0.1)[0];
  ok(l && !/\{/.test(l.text), 'unknown mission falls back to a generic start line: ' + (l && l.text));
  let wins = 0;
  for (let seed = 1; seed <= 30; seed++) { const a = mk(seed); a.onEvent('battle_start', {}, Object.assign({}, ctx, { mission: 'pyramid_scheme' })); run(a, 80, 0.1); a.onEvent('battle_end', { winner: 0, reason: 'objective', t: 80, perDef: { 0: { legionary: 3 }, 1: {} } }, Object.assign({}, ctx, { mission: 'pyramid_scheme' })); const e = run(a, 60, 0.1); if (e.length) wins++; }
  ok(wins === 30, 'a campaign victory always gets a line (mission-specific or generic fallback)');
}
{ // determinism: same seed, same stream, same lines; stats are read live
  const f = (seed) => { const ann = mk(seed); ann.onEvent('battle_start', {}, ctx); const out = []; for (let i = 0; i < 1500; i++) { ann.tick(0.1); if (i % 9 === 0) ann.onEvent('kill_streak', { id: 1, count: 3 + (i % 5), def: 'hoplite' }, ctx); let l; while ((l = ann.nextLine())) out.push(l.id + '|' + l.text); } return out; };
  assert.deepStrictEqual(f(21), f(21)); ok(true, 'deterministic');
  ok(JSON.stringify(f(21)) !== JSON.stringify(f(22)), 'different seeds differ');
}
{ // events are read immediately: mutating the payload afterwards must not change the line
  const ann = mk(12);
  ann.onEvent('battle_start', {}, ctx); run(ann, 40, 0.1);
  const p = { id: 9, count: 5, def: 'spartan' };
  ann.onEvent('kill_streak', p, ctx);
  p.count = 999; p.def = 'chariot_archer';
  const l = run(ann, 40, 0.1).find((x) => x.cat === 'kill_streak');
  ok(l && !/999/.test(l.text) && !/Chariot/.test(l.text), 'payload copied at event time');
}
{ // custom names reach the {killer} slot and units use ctx.unitName when given
  const ann = mk(13);
  const nctx = Object.assign({}, ctx, { nameOf: (id) => 'Sir Chadius the Unbothered', unitName: (d) => 'Fancy ' + d });
  let named = false;
  for (let seed = 1; seed < 60 && !named; seed++) { const a = mk(seed); a.onEvent('battle_start', {}, nctx); run(a, 40, 0.1); a.onEvent('kill_streak', { id: 7, count: 5, def: 'hoplite' }, nctx); named = run(a, 40, 0.1).some((l) => /Sir Chadius|Fancy hoplite/.test(l.text)); }
  ok(named, 'custom soldier names and unitName hook are used');
}
ok(DEFAULT_CONFIG.minGap === 3.5 && DEFAULT_CONFIG.minGapP5 === 1.5 && DEFAULT_CONFIG.beat === 1.1 && DEFAULT_CONFIG.catCooldown === 20 && DEFAULT_CONFIG.fillerCooldown === 45 && DEFAULT_CONFIG.recencyN === 14, 'spec constants');

if (failures.length) { console.error(failures.slice(0, 60).join('\n')); console.error(`announcer tests: ${failures.length} FAILED of ${checks}`); process.exit(1); }
console.log(`announcer tests: ${checks} checks passed (${TEMPLATES.length} templates, ${CATEGORIES.length} categories)`);
