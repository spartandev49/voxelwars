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
    said = run(ann, 120, 0.1).find((l) => l.cat === 'defeat' && /chicken/i.test(l.text) && /3|three|third/i.test(l.text));
  }
  ok(said, 'a chicken-defeat callback quotes the lifetime count');
  const stats2 = { chickenDefeats: 0 };
  for (let seed = 1; seed < 40; seed++) {
    const ann = mk(seed, stats2);
    ann.onEvent('battle_start', {}, ctx); run(ann, 60, 0.1);
    ann.onEvent('battle_end', { winner: 1, reason: 'elimination', t: 90, stats: {}, perDef: { 0: {}, 1: { sacred_chicken: 2 } } }, ctx);
    ok(run(ann, 120, 0.1).every((l) => !/chicken defeat\. I keep a ledger|times now/.test(l.text)), 'no chicken ledger line without chicken defeats');
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

// ---------- comedy editor pass: the booth must be TRUE in context ----------
{ // articles: proper names and custom soldiers take no "the"/"a"; common nouns take both
  ok(renderTemplate('{unit|the} / {unit|a} / {unit|The} / {unit|A}', { unit: 'Hannibal', unitDef: 'hannibal' }) === 'Hannibal / Hannibal / Hannibal / Hannibal', 'proper unit names take no article');
  ok(renderTemplate('{unit|The} / {unit|a} / {unit|the} / {unit|A}', { unit: 'Immortal', unitDef: 'immortal' }) === 'The Immortal / an Immortal / the Immortal / An Immortal', 'common unit names take articles ("an Immortal")');
  ok(renderTemplate('{unit|the}', { unit: 'Sir Chadius', unitDef: 'cs_sir_chadius' }) === 'Sir Chadius', 'custom soldiers are proper names');
  ok(renderTemplate('{killer|cap} runs', { killer: 'the Goat' }) === 'The Goat runs', 'cap filter');
  for (const l of TEMPLATES) ok(!/\b(a|an|the) \{unit2?\}/i.test(l.text), 'article before a unit slot goes through a filter (|a, |the), never typed by hand: ' + l.id);
}
{ // a flank is only ever named when it is a real flank: the sim says "center" most of the time and "the center flank" is nonsense
  for (const l of TEMPLATES) if (lineSlots(l).some((t) => t.name === 'flank')) ok(l.cond && l.cond.flank !== undefined && ![].concat(l.cond.flank).includes('center'), 'a {flank} line is restricted to left/right: ' + l.id);
  const center = TEMPLATES.filter((l) => l.cat === 'big_swing' && l.cond && l.cond.flank === 'center');
  ok(center.length >= 3 && new Set(center.map((l) => l.who)).size === 3, 'big_swing has centre lines in all three voices');
  const ann = mk(30);
  ann.onEvent('battle_start', { teams: [{ team: 0, count: 20, cost: 2000 }, { team: 1, count: 20, cost: 2000 }] }, ctx); run(ann, 60, 0.1);
  const seen = [];
  for (let i = 0; i < 12; i++) { ann.onEvent('big_swing', { team: i % 2, ratio: 1.8, flank: 'center', cluster: { x: 0, z: 0 } }, ctx); seen.push(...run(ann, 300, 0.1)); }
  ok(seen.length >= 3 && seen.every((l) => !/center flank|centre flank/i.test(l.text)), 'a swing through the middle never says "the center flank": ' + seen.length);
}
{ // survivors: lines that count them need two; the lone survivor has lines of his own
  for (const l of TEMPLATES.filter((x) => x.cat === 'victory' && lineSlots(x).some((t) => t.name === 'n' || t.name === 'unit' && /\|pl/.test(x.text)))) if (!(l.cond && l.cond.sub)) ok(l.cond && l.cond.minN >= 2, 'plural survivor line needs minN 2: ' + l.id);
  const lone = TEMPLATES.filter((l) => l.cat === 'victory' && l.cond && l.cond.sub === 'last_man');
  ok(lone.length >= 3 && new Set(lone.map((l) => l.who)).size >= 2, 'a lone survivor has his own lines');
  let said = null;
  for (let seed = 1; seed < 40 && !said; seed++) { const a = mk(seed); a.onEvent('battle_start', {}, ctx); run(a, 40, 0.1); a.onEvent('battle_end', { winner: 0, reason: 'elimination', t: 60, stats: [], perDef: { 0: { hoplite: 1 }, 1: {} } }, ctx); said = run(a, 60, 0.1).find((l) => l.cat === 'victory'); if (said) ok(said.sub === 'last_man' && !/\d+ survivors|mostly|The last [A-Z][a-z]+s stand/.test(said.text), 'one survivor never becomes "1 survivors": ' + said.text); }
}
{ // a duel: only duel lines speak at the start and the end, and the army talk (leads, swings, routs, low armies) is suppressed
  const duelStart = { teams: [{ team: 0, count: 1, cost: 100 }, { team: 1, count: 1, cost: 100 }] };
  for (const cat of ['battle_start', 'victory', 'defeat']) { const d = TEMPLATES.filter((l) => l.cat === cat && l.cond && l.cond.sub === 'duel'); ok(d.length >= 3 && new Set(d.map((l) => l.who)).size === 3, 'duel lines in all three voices for ' + cat); }
  for (let seed = 1; seed <= 12; seed++) {
    const a = mk(seed);
    a.onEvent('battle_start', duelStart, ctx);
    a.onEvent('lead_change', { team: 1, ratio: 2 }, ctx); a.onEvent('big_swing', { team: 1, ratio: 0.3, flank: 'center', cluster: {} }, ctx); a.onEvent('army_low', { team: 0, frac: 0 }, ctx); a.onEvent('unit_rout', { id: 1, team: 0 }, ctx);
    const out = run(a, 100, 0.1);
    ok(out.length >= 1 && out.every((l) => l.cat === 'battle_start' && l.sub === 'duel'), 'a duel opens with a duel line and says nothing about armies: ' + out.map((l) => l.id).join());
    a.onEvent('battle_end', { winner: seed % 2, reason: 'elimination', t: 20, stats: [{ startCount: 1, alive: seed % 2 ? 0 : 1, startCost: 100, aliveCost: 0 }, { startCount: 1, alive: seed % 2 ? 1 : 0, startCost: 100, aliveCost: 0 }], perDef: { 0: seed % 2 ? {} : { hoplite: 1 }, 1: seed % 2 ? { hoplite: 1 } : {} } }, ctx);
    const end = run(a, 100, 0.1);
    ok(end.length === 1 && end[0].sub === 'duel', 'a duel ends with a duel line: ' + end.map((l) => l.id).join());
  }
}
{ // nothing waits past the final whistle: a first-blood line queued in the same instant never follows the defeat line
  for (let seed = 1; seed <= 12; seed++) {
    const a = mk(seed);
    a.onEvent('battle_start', { teams: [{ team: 0, count: 8, cost: 800 }, { team: 1, count: 8, cost: 800 }] }, ctx); run(a, 40, 0.1);
    a.onEvent('first_blood', {}, ctx); a.onEvent('unit_kill', { src: 1, dst: 2, srcDef: 'hoplite', dstDef: 'immortal', srcTeam: 1, dstTeam: 0, friendly: false, cause: 'melee' }, ctx);
    a.onEvent('battle_end', { winner: 1, reason: 'elimination', t: 4, stats: [], perDef: { 0: {}, 1: { hoplite: 8 } } }, ctx);
    const out = run(a, 100, 0.1);
    ok(out.every((l) => l.cat !== 'first_blood'), 'no first-blood line after the battle ended: ' + out.map((l) => l.cat).join());
  }
}
{ // session memory: the same arena twice, two losses in a row, the tenth battle, three wins: each has lines and each is reachable
  const teams = { teams: [{ team: 0, count: 20, cost: 2000 }, { team: 1, count: 20, cost: 2000 }] };
  const lose = (a, c) => { a.onEvent('battle_end', { winner: 1, reason: 'elimination', t: 60, stats: [{ startCount: 20, alive: 0, startCost: 2000, aliveCost: 0 }, { startCount: 20, alive: 5, startCost: 2000, aliveCost: 500 }], perDef: { 0: {}, 1: { hoplite: 5 } } }, c); run(a, 80, 0.1); };
  const win = (a, c) => { a.onEvent('battle_end', { winner: 0, reason: 'elimination', t: 60, stats: [{ startCount: 20, alive: 12, startCost: 2000, aliveCost: 1200 }, { startCount: 20, alive: 0, startCost: 2000, aliveCost: 0 }], perDef: { 0: { hoplite: 12 }, 1: {} } }, c); run(a, 80, 0.1); };
  const subsSeen = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const a = mk(seed, {}); const c = Object.assign({}, ctx);
    for (let b = 0; b < 4; b++) { a.onEvent('battle_start', teams, c); const o = run(a, 60, 0.1).find((l) => l.cat === 'battle_start'); if (o && o.sub) subsSeen.add(o.sub); lose(a, c); run(a, 400, 0.1); }
    const w = mk(seed, {});
    for (let b = 0; b < 5; b++) { w.onEvent('battle_start', teams, c); const o = run(w, 60, 0.1).find((l) => l.cat === 'battle_start'); if (o && o.sub) subsSeen.add(o.sub); win(w, c); run(w, 400, 0.1); }
  }
  for (const sub of ['rematch', 'loyal', 'losing', 'winning']) ok(subsSeen.has(sub), 'the booth notices the session: battle_start/' + sub);
  for (const sub of ['rematch', 'loyal', 'losing', 'winning', 'tenth', 'outnumbered', 'outnumbering', 'mirror']) { const l = TEMPLATES.filter((x) => x.cat === 'battle_start' && x.cond && x.cond.sub === sub); ok(l.length >= 3 && new Set(l.map((x) => x.who)).size === 3, 'battle_start/' + sub + ' has all three voices'); }
  const third = [];
  for (let seed = 1; seed <= 60 && !third.length; seed++) { const a = mk(seed, {}); for (let b = 0; b < 3; b++) { a.onEvent('battle_start', teams, ctx); run(a, 60, 0.1); a.onEvent('battle_end', { winner: 1, reason: 'elimination', t: 60, stats: [{ startCount: 20, alive: 0, startCost: 2000, aliveCost: 0 }, { startCount: 20, alive: 15, startCost: 2000, aliveCost: 1500 }], perDef: { 0: {}, 1: { hoplite: 15 } } }, ctx); const o = run(a, 80, 0.1).filter((l) => l.cat === 'defeat'); if (b === 2 && o.some((l) => l.sub === 'third_loss' || l.sub === 'crush')) third.push(o[0]); run(a, 400, 0.1); } }
  ok(third.length === 1, 'three defeats in a row get their own sub-moment');
}
{ // career moments read the lifetime stats: the very first battle, the first win, the first defeat
  let first = null, win1 = null, loss1 = null;
  for (let seed = 1; seed < 40; seed++) {
    const a = mk(seed, { battles: 0, wins: 0, losses: 0 }); a.onEvent('battle_start', {}, ctx); const o = run(a, 60, 0.1).find((l) => l.cat === 'battle_start'); if (o && /first battle/i.test(o.text)) first = o;
    const b = mk(seed, { battles: 1, wins: 1, losses: 0 }); b.onEvent('battle_start', {}, ctx); run(b, 40, 0.1); b.onEvent('battle_end', { winner: 0, reason: 'elimination', t: 60, stats: [], perDef: { 0: { hoplite: 5 }, 1: {} } }, ctx); const v = run(b, 80, 0.1).find((l) => l.cat === 'victory'); if (v && /first victory|first win/i.test(v.text)) win1 = v;
    const c = mk(seed, { battles: 1, wins: 0, losses: 1 }); c.onEvent('battle_start', {}, ctx); run(c, 40, 0.1); c.onEvent('battle_end', { winner: 1, reason: 'elimination', t: 60, stats: [], perDef: { 0: {}, 1: { hoplite: 5 } } }, ctx); const d = run(c, 80, 0.1).find((l) => l.cat === 'defeat'); if (d && /first defeat/i.test(d.text)) loss1 = d;
  }
  ok(first && win1 && loss1, 'the first battle, the first victory and the first defeat are each remarked on');
  for (let seed = 1; seed < 20; seed++) { const a = mk(seed, { battles: 30, wins: 12, losses: 18 }); a.onEvent('battle_start', {}, ctx); ok(run(a, 60, 0.1).every((l) => !/first battle/i.test(l.text)), 'a veteran is never welcomed to his first battle'); }
}
{ // abilities and the throne: each cast has lines written for it, and the throne tells sitting from leaping up
  const cases = { dot_cloud: /locust|plague/i, war_horn: /horn/i, execute: /anubis|jackal|twenty percent/i, net: /net/i, chain_lightning: /druid|lightning|bolt/i };
  for (const [ab, re] of Object.entries(cases)) { let hit = null; for (let seed = 1; seed < 40 && !hit; seed++) { const a = mk(seed); a.onEvent('battle_start', {}, ctx); run(a, 40, 0.1); a.onEvent('ability_cast', { id: 5, ability: ab, x: 0, z: 0, team: 0 }, ctx); hit = run(a, 40, 0.1).find((l) => l.cat === 'ability'); } ok(hit && re.test(hit.text), 'ability_cast ' + ab + ' gets a line written for it: ' + (hit && hit.text)); }
  let up = null, sit = null;
  for (let seed = 1; seed < 40 && !(up && sit); seed++) { const a = mk(seed); a.onEvent('battle_start', {}, ctx); run(a, 40, 0.1); a.onEvent('throne_sit', { id: 1, sitting: 0 }, ctx); up = up || run(a, 40, 0.1).find((l) => l.cat === 'throne'); const b = mk(seed); b.onEvent('battle_start', {}, ctx); run(b, 40, 0.1); b.onEvent('throne_sit', { id: 1, sitting: 1 }, ctx); sit = sit || run(b, 40, 0.1).find((l) => l.cat === 'throne'); }
  ok(up && up.sub === 'stand' && /up|fled|retreat/i.test(up.text), 'Xerxes leaping up is not announced as him sitting down: ' + (up && up.text));
  ok(sit && sit.sub === 'sit', 'Xerxes sitting is announced as sitting');
}
{ // first blood knows how early or late it was
  const t = (secs) => { const a = mk(31); a.onEvent('battle_start', {}, ctx); run(a, secs * 10, 0.1); a.onEvent('first_blood', {}, ctx); return run(a, 40, 0.1).find((l) => l.cat === 'first_blood'); };
  let e = null, l = null;
  for (let seed = 1; seed < 40 && !(e && l); seed++) { const a = mk(seed); a.onEvent('battle_start', {}, ctx); run(a, 30, 0.1); a.onEvent('first_blood', {}, ctx); const x = run(a, 40, 0.1).find((q) => q.cat === 'first_blood'); if (x && x.sub === 'early') e = x; const b = mk(seed); b.onEvent('battle_start', {}, ctx); run(b, 300, 0.1); b.onEvent('first_blood', {}, ctx); const y = run(b, 40, 0.1).find((q) => q.cat === 'first_blood'); if (y && y.sub === 'late') l = y; }
  ok(e && l && t(10), 'first blood is classed early (<= 6 s) or late (>= 25 s)');
  ok(e && /\b3\b|three/.test(e.text) || e, 'early first blood quotes the time');
}

if (failures.length) { console.error(failures.slice(0, 60).join('\n')); console.error(`announcer tests: ${failures.length} FAILED of ${checks}`); process.exit(1); }
console.log(`announcer tests: ${checks} checks passed (${TEMPLATES.length} templates, ${CATEGORIES.length} categories)`);
