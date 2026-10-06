// Controllers behind Game.aim / possessInput / teachingNext / skipTeaching / killcam, driven with a real World. Run: node tests/app/controllers.test.mjs
import assert from 'node:assert/strict';
import { makeWorld, makeMeta, FakeGame, mem } from './_harness.mjs';
import { TeachingGuide, AimController, PossessController, KillCam, buildFunnyStats } from '../../src/app/meta.js';
import { RNG } from '../../src/core/rng.js';
import { TEACHING_BEATS } from '../../src/content/era_ancient/campaign_text.js';

const run = (w, n) => { for (let i = 0; i < n; i++) w.tick(); };

// ---------------------------------------------------------------- teaching beats
{
  const done = []; const T = new TeachingGuide({ onFinish: () => done.push(1) });
  assert.equal(T.hud(), null, 'nothing before start'); assert.equal(T.start(), true);
  let h = T.hud(); assert.equal(h.id, 'place_spears'); assert.equal(h.index, 0); assert.equal(h.total, TEACHING_BEATS.length); assert.equal(h.who, 'plato'); assert.equal(h.canSkip, true); assert.equal(h.ack, false); assert.ok(h.text.length > 20 && h.title.length > 5);
  assert.equal(T.action('placed', 3), false, 'three soldiers is not a line yet'); assert.ok(T.hud());
  assert.equal(T.action('placed', 6), true); assert.equal(T.hud(), null, 'placing the line completes beat 1; the card waits for the next trigger');
  assert.equal(T.trigger('battle_start'), true); h = T.hud(); assert.equal(h.id, 'fight'); assert.equal(h.ack, true); assert.equal(h.target, 'speed');
  assert.equal(T.trigger('battle_start'), false, 'a trigger fires once'); assert.equal(T.trigger('placement_start'), false, 'cannot go back');
  T.next(); assert.equal(T.hud(), null, '"Got it" hides the card');
  assert.equal(T.trigger('first_contact'), true); h = T.hud(); assert.equal(h.id, 'god_power'); assert.equal(h.target, 'powers'); assert.equal(h.ack, false);
  assert.equal(T.action('power_cast'), true); assert.equal(T.hud(), null, 'casting a god power completes the step');
  assert.equal(T.trigger('battle_end'), true, 'a later trigger skips the cavalry step that never happened'); assert.equal(done.length, 1, 'the last card counts as seen (the results overlay covers it)'); assert.equal(T.hud(), null);
  assert.equal(T.trigger('cavalry_brace'), false);
  // skip persists and works from any step
  const d2 = []; const T2 = new TeachingGuide({ onFinish: () => d2.push(1) }); T2.start(); assert.equal(T2.skip(), true); assert.equal(d2.length, 1); assert.equal(T2.hud(), null); assert.equal(T2.trigger('battle_start'), false);
  // already dismissed: never starts
  const T3 = new TeachingGuide({ isDismissed: () => true }); assert.equal(T3.start(), false); assert.equal(T3.hud(), null); assert.equal(T3.next(), false);
  // wrong actions are ignored
  const T4 = new TeachingGuide(); T4.start(); assert.equal(T4.action('power_cast'), false); T4.trigger('battle_start'); assert.equal(T4.action('placed', 9), false);
  // "Got it" on the final beat finishes (when the final card is reached with next())
  const d5 = []; const T5 = new TeachingGuide({ onFinish: () => d5.push(1) }); T5.start(); T5.idx = TEACHING_BEATS.length - 1; T5.waiting = false; assert.ok(T5.hud().ack); T5.next(); assert.equal(d5.length, 1);
}

// ---------------------------------------------------------------- teaching through the meta layer: mission 1 setup, persistence in vw.seen + settings.seenHints
{
  const w = makeWorld({ a: [['hoplite', 8]], b: [['hoplite', 3]] });
  const X = makeMeta({ world: w, setup: { kind: 'campaign', mission: 'marathon_sort_of', arena: { presetId: 'marathon' }, rules: {}, armies: {} } });
  assert.equal(X.meta.decorateHud({}).teaching.id, 'place_spears', 'mission 1 starts the tutorial at placement');
  X.meta.teaching.action('placed', w.stats[0].alive); X.game.state = 'countdown'; w.start(0);
  assert.equal(X.meta.decorateHud({}).teaching.id, 'fight', 'battle_start shows the next card (event from the real bus)');
  let n = 0; while (w.state !== 'ended' && n++ < 30 * 200) w.tick();
  assert.equal(X.docs.seen.get('teaching'), true, 'finished tutorial persisted in vw.seen'); assert.equal(X.settings.get('seenHints').teaching, true);
  // next attach: not shown again
  const w2 = makeWorld({}); X.game.world = w2; X.meta.attach(w2, { kind: 'campaign', mission: 'marathon_sort_of', arena: { presetId: 'marathon' }, rules: {}, armies: {} }); assert.equal(X.meta.decorateHud({}).teaching, null);
  // a non-mission quick battle never shows it
  const X2 = makeMeta({ world: makeWorld({}) }); assert.equal(X2.meta.decorateHud({}).teaching, null);
  // skip through Game.skipTeaching -> persists, hides
  const X3 = makeMeta({ world: makeWorld({}), setup: { kind: 'campaign', mission: 'marathon_sort_of', arena: {}, rules: {}, armies: {} } }); assert.ok(X3.meta.decorateHud({}).teaching); X3.meta.teaching.skip(); assert.equal(X3.meta.decorateHud({}).teaching, null); assert.equal(X3.docs.seen.get('teaching'), true);
  // first_contact is raised by the first hit between the sides, power_cast by our god_power event
  const w4 = makeWorld({ a: [['hoplite', 6]], b: [['hoplite', 6]], gap: 4 }); const X4 = makeMeta({ world: w4, setup: { kind: 'campaign', mission: 'marathon_sort_of', arena: {}, rules: {}, armies: {} } });
  X4.meta.teaching.action('placed', 12); X4.game.state = 'running'; w4.start(0); run(w4, 3); X4.meta.teaching.next(); let m = 0; while (!X4.meta.decorateHud({}).teaching && m++ < 900) w4.tick();
  assert.equal(X4.meta.decorateHud({}).teaching && X4.meta.decorateHud({}).teaching.id, 'god_power', 'first contact raised by unit_hit');
  w4.input(w4.tickN + 1, { type: 'cast', power: 'zeus_lightning', x: 0, z: 0, team: 0 }); run(w4, 20); assert.equal(X4.meta.decorateHud({}).teaching, null, 'our cast completed the step');
}

// ---------------------------------------------------------------- god-power aim
{
  const w = makeWorld({ a: [['hoplite', 6]], b: [['hoplite', 6]], gap: 40 });
  const X = makeMeta({ world: w }); const g = X.game, A = X.meta.aim;
  const ring = { calls: [], show(x, z, r, id) { this.calls.push(['show', x, z, r, id]); }, hide() { this.calls.push(['hide']); }, dispose() {} }; A.makeRing = () => ring;
  assert.equal(A.set('meteor'), false, 'placement: the gods wait'); assert.match(g.eventsOf('toast').pop().text, /gods wait/);
  w.start(3); g.state = 'countdown'; assert.equal(A.set('meteor'), true, 'arming during the countdown is allowed'); assert.equal(A.click(1, 1), true, 'but the click is swallowed with a toast until the fight starts'); assert.equal(A.active, true); assert.match(g.eventsOf('toast').pop().text, /not started/); assert.equal(g.casts.length, 0); A.cancel(true);
  run(w, 100); g.state = 'running'; assert.equal(w.state, 'running');
  assert.equal(A.set('not_a_power'), false); assert.equal(A.active, false);
  A.hover(5, 6); assert.equal(A.set('meteor'), true); assert.equal(A.active, true); assert.equal(A.id, 'meteor'); assert.deepEqual(ring.calls.pop(), ['show', 5, 6, 5, 'meteor'], 'the ring appears at the last cursor position with the power radius');
  A.hover(8, -2); assert.deepEqual(ring.calls.pop(), ['show', 8, -2, 5, 'meteor']); assert.equal(g.eventsOf('aim').pop().id, 'meteor');
  assert.equal(A.click(10, 11), true, 'the click is consumed'); assert.deepEqual(g.casts, [['meteor', 10, 11, 0]]); assert.equal(A.active, false); assert.deepEqual(ring.calls.pop(), ['hide']);
  assert.equal(A.click(1, 1), false, 'not armed: clicks pass through to selection');
  run(w, 70); assert.ok(w.godpowers.list(0).find((p) => p.id === 'meteor').cd > 0, 'the cast reached the sim through world.input');
  assert.equal(A.set('meteor'), false, 'cooldown: refused with a toast'); assert.match(g.eventsOf('toast').pop().text, /needs \d+ more seconds/);
  // Esc / right click: cancel; aim(null) is the HUD's disarm and is idempotent
  assert.equal(A.set('zeus_lightning'), true); assert.equal(A.cancel(), true); assert.equal(A.active, false); assert.equal(A.cancel(), false); assert.equal(A.set('zeus_lightning'), true); assert.equal(A.set(null), false); assert.equal(A.active, false);
  assert.equal(g.eventsOf('aim').pop().id, null);
  // two armed powers: arming another replaces the first
  A.set('zeus_lightning'); A.set('heal_wave'); assert.equal(A.id, 'heal_wave');
  // rules.godPowers = false
  const wOff = makeWorld({ rules: { godPowers: false } }); const Y = makeMeta({ world: wOff }); Y.game.state = 'running'; wOff.start(0); assert.equal(Y.meta.aim.set('meteor'), false); assert.match(Y.game.eventsOf('toast').pop().text, /off/);
  // safe when the world is null / detached
  const Z = makeMeta({}); assert.equal(Z.meta.aim.set('meteor'), false); assert.equal(Z.meta.aim.set(null), false); assert.equal(Z.meta.aim.click(0, 0), false); Z.meta.aim.hover(1, 2);
  // the cast power really lands: a lightning strike on the enemy block emits god_power and counts in the lifetime stats
  const w5 = makeWorld({ a: [['hoplite', 4]], b: [['hoplite', 8]], gap: 30 }); const V = makeMeta({ world: w5 }); V.game.state = 'running'; w5.start(0); run(w5, 2);
  const c = w5.centroid[1]; V.meta.aim.set('zeus_lightning'); V.meta.aim.click(c.x, c.z); run(w5, 30); assert.equal(V.stats.get().godPowers.zeus_lightning, 1);
}

// ---------------------------------------------------------------- Take Command input
{
  const w = makeWorld({ a: [['hoplite', 3]], b: [['hoplite', 3]], gap: 60 }); const X = makeMeta({ world: w }); const g = X.game, P = X.meta.possess;
  g.state = 'running'; w.start(0); run(w, 2);
  assert.equal(P.input({ move: { x: 1, y: 0 } }), false, 'nobody possessed: ignored');
  const me = w.units.find((u) => u.team === 0); g.possess(me.id); run(w, 2); assert.equal(w.possession.current, me);
  const hud = X.meta.decorateHud({}); assert.equal(hud.possess.id, me.id); assert.equal(hud.possess.hpMax, me.hpMax); assert.ok(Array.isArray(hud.possess.abilities));
  // camera yaw 0: forward (screen y < 0) is -z; right is +x
  g.rig.syaw = 0; const z0 = me.z, x0 = me.x;
  assert.equal(P.input({ move: { x: 0, y: -1 } }), true); for (let i = 0; i < 45; i++) { w.tick(); P.tick(1 / 30); } assert.ok(me.z < z0 - 1.5, 'forward with yaw 0 walks to -z: ' + (me.z - z0).toFixed(2)); assert.ok(Math.abs(me.x - x0) < 0.8);
  // yaw = -pi/2: forward is +x
  g.rig.syaw = -Math.PI / 2; const x1 = me.x; for (let i = 0; i < 45; i++) { w.tick(); P.tick(1 / 30); } assert.ok(me.x > x1 + 1.5, 'forward with yaw -pi/2 walks to +x: ' + (me.x - x1).toFixed(2));
  // stick to the right (x = 1) at yaw 0 -> +x ; release stops
  g.rig.syaw = 0; P.input({ move: { x: 1, y: 0 } }); const x2 = me.x; for (let i = 0; i < 30; i++) { w.tick(); P.tick(1 / 30); } assert.ok(me.x > x2 + 1);
  P.input({ move: { x: 0, y: 0 } }); run(w, 10); const x3 = me.x; run(w, 20); assert.ok(Math.abs(me.x - x3) < 0.05, 'a released stick stops the soldier');
  // what reaches the sim: commands are tick-stamped possess envelopes
  const q0 = w.inputQ.length; P.input({ move: { x: 0.5, y: -0.5 }, sprint: true }); const cmd = w.inputQ[w.inputQ.length - 1].cmd; assert.equal(w.inputQ.length, q0 + 1);
  assert.equal(cmd.type, 'possess'); assert.equal(cmd.unit, me.id); assert.ok(Math.abs(Math.hypot(cmd.move.x, cmd.move.z) - 1) < 1e-9, 'sprint = full speed'); assert.equal(typeof cmd.attack, 'boolean'); assert.equal(w.inputQ[w.inputQ.length - 1].tick, w.tickN + 1);
  P.input({ move: { x: 0.5, y: 0 }, sprint: false }); assert.ok(Math.abs(Math.hypot(w.inputQ.at(-1).cmd.move.x, w.inputQ.at(-1).cmd.move.z) - 0.5) < 1e-9, 'analog stick keeps its magnitude'); P.input({ move: { x: 0.05, y: 0.05 } }); assert.deepEqual(w.inputQ.at(-1).cmd.move, { x: 0, z: 0 }, 'dead zone');
  // attack: a tap holds for 0.5 s then releases; ability is edge-triggered once
  P.input({ move: { x: 0, y: 0 } }); P.input({ attack: true }); assert.equal(w.inputQ.at(-1).cmd.attack, true); P.tick(0.3); assert.equal(P.hold > 0, true); P.tick(0.3); const sent = w.inputQ.at(-1).cmd; assert.equal(sent.attack, false, 'the held attack released after 0.5 s');
  const ab2 = () => w.inputQ.filter((i) => i.cmd.ability === 2).length; P.input({ ability: 2 }); assert.equal(w.inputQ.at(-1).cmd.ability, 2); assert.equal(ab2(), 1); P.tick(0.05); P.tick(0.05); P.tick(0.05); assert.equal(ab2(), 1, 'ability fires once, never repeats'); const qa = w.inputQ.length; P.input({ ability: 9 }); assert.equal(w.inputQ.at(-1).cmd.ability, 0, 'out-of-range ability ignored'); assert.equal(w.inputQ.length, qa + 1);
  P.input({ move: { x: NaN, y: Infinity } }); assert.deepEqual(w.inputQ.at(-1).cmd.move, { x: 0, z: 0 }, 'NaN / Infinity never reach the sim'); assert.equal(P.input(null), false); assert.equal(P.input('x'), false);
  // keyboard path (input.js -> Game.sendPossess): a held key wins, the stick fills in when the keys are idle
  P.input({ move: { x: 0, y: -1 } }); P.fromKeyboard(1, 0, false, 0); assert.deepEqual(w.inputQ.at(-1).cmd.move, { x: 1, z: 0 }); P.fromKeyboard(0, 0, true, 3); const kc = w.inputQ.at(-1).cmd; assert.equal(kc.attack, true); assert.equal(kc.ability, 3); assert.ok(kc.move.z < -0.9, 'stick used when no key is down');
  // while the keyboard path is alive the touch repeater stays quiet (no double stream)
  const q1 = w.inputQ.length; P.fromKeyboard(0, 0, false, 0); P.tick(0.05); assert.equal(w.inputQ.length, q1 + 1);
  // the possessed soldier falls: onFrame hands control back with a toast
  me.hp = 0.001; w.areaDamage(null, me.x, me.z, 1, 999, Object.assign(w.acquireHit(), { type: 'magic', cause: 'lightning' }), -1); w.releaseHit(); run(w, 3); assert.ok(!me.alive);
  X.meta.onFrame(0.05); assert.equal(g.possessId, 0); assert.match(g.eventsOf('toast').pop().text, /soldier has fallen/);
  // not possessing anymore: ignored; a finished battle: ignored
  assert.equal(P.input({ move: { x: 1, y: 0 } }), false);
}

// ---------------------------------------------------------------- kill-cam
{
  const w = makeWorld({ a: [['hoplite', 12]], b: [['hoplite', 3]] }); const X = makeMeta({ world: w }); const g = X.game;
  assert.equal(await X.meta.killcam.start(), false, 'before the battle ends there is nothing to play');
  g.state = 'running'; w.start(0); let n = 0; while (w.state !== 'ended' && n++ < 30 * 200) w.tick(); g.state = 'ended';
  const R0 = X.meta.decorateResults({ mvp: null, funnyStats: [], lessons: [] }); const snap = JSON.stringify({ r: R0, t: w.time, s: w.stats, h: w.stateHash(), st: X.stats.totals() });
  const rig0 = JSON.stringify(Object.assign({}, g.rig, { _unit: undefined }));
  g.paused = true; g.speed = 2;
  const p = X.meta.killcam.start(); assert.equal(X.meta.killcam.start(), p, 're-entrant: the same promise'); assert.equal(X.meta.killcam.active, true);
  assert.equal(g.rig.mode, 'killcam'); assert.equal(g.getSpeed(), 0.25, 'slow-mo'); assert.equal(g.isPaused(), false, 'a paused game plays the cinematic');
  const kt = X.meta.killcam.tg; assert.ok(kt && Number.isFinite(kt.x) && Number.isFinite(kt.z), 'it looks at the final kill');
  const dists = []; for (let i = 0; i < 4 * 30 + 5; i++) { X.meta.onFrame(1 / 30); w.tick(); dists.push(g.rig.dist); if (!X.meta.killcam.active) break; }
  const nearest = Math.min(...dists); assert.ok(dists[0] > nearest + 5 && nearest < 14, 'the camera dollies in: ' + dists[0].toFixed(1) + ' -> ' + nearest.toFixed(1));
  assert.equal(await p, true); assert.equal(X.meta.killcam.active, false);
  assert.equal(g.getSpeed(), 2, 'speed restored'); assert.equal(g.isPaused(), true, 'pause restored'); assert.equal(g.rig.mode, 'orbit');
  assert.equal(JSON.stringify(Object.assign({}, g.rig, { _unit: undefined })), rig0, 'camera restored exactly');
  assert.equal(JSON.stringify({ r: X.meta.decorateResults({ mvp: null, funnyStats: [], lessons: [] }), t: w.time, s: w.stats, h: w.stateHash(), st: X.stats.totals() }), snap, 'the kill-cam does not change results, stats or the sim');
  // cancel mid-way restores too; detach (rematch) resolves without touching the new battle's camera
  g.paused = false; g.speed = 1; const p2 = X.meta.killcam.start(); X.meta.onFrame(0.5); X.meta.killcam.cancel(); assert.equal(await p2, true); assert.equal(g.getSpeed(), 1);
  const p3 = X.meta.killcam.start(); X.meta.detach(); assert.equal(await p3, false); assert.equal(X.meta.killcam.active, false);
  // safe without a world
  assert.equal(await makeMeta({}).meta.killcam.start(), false); assert.equal(await new KillCam({ game: new FakeGame() }).start(), false);
}

// ---------------------------------------------------------------- kill-cam target: the last hero / boss / streak kill; the button is hidden without one (spec ui.md §4)
{
  const run2 = (spec) => { const w = makeWorld(spec); const X = makeMeta({ world: w }); X.game.state = 'running'; w.start(0); let n = 0; while (w.state !== 'ended' && n++ < 30 * 240) w.tick(); X.game.state = 'ended'; return { w, X }; };
  const hero = run2({ a: [['hoplite', 16]], b: [['strategos', 1]], seed: 5 });
  const R1 = hero.X.meta.decorateResults({ mvp: null, funnyStats: [], lessons: [] });
  assert.equal(R1.canKillcam, true, 'a hero died: the kill-cam button is offered'); const tg = hero.X.meta.killcam.target(); assert.equal(tg.why, 'hero');
  const hk = hero.w.units.concat(hero.w.dying).find((u) => u.def.id === 'strategos'); assert.ok(Math.hypot(tg.x - hk.x, tg.z - hk.z) < 1.5, "the camera looks where the hero fell");
  const boss = run2({ a: [['hoplite', 30]], b: [['minotaur', 1]], seed: 5 }); assert.equal(boss.X.meta.decorateResults({}).canKillcam, true); assert.equal(boss.X.meta.killcam.target().why, 'boss');
  const plain = run2({ a: [['hoplite', 12]], b: [['hoplite', 2]], seed: 9 }); const R3 = plain.X.meta.decorateResults({});
  assert.equal(R3.canKillcam, plain.X.meta.qualKill !== null, 'only hero / boss / streak kills qualify'); if (!plain.X.meta.qualKill) assert.equal(plain.X.meta.killcam.target().why, 'final', 'programmatic killcam() still has the final kill');
  // a kill streak qualifies
  const streak = makeWorld({ a: [['hoplite', 1]], b: [['hoplite', 1]] }); const S = makeMeta({ world: streak }); const bus = streak.events;
  bus.emit('unit_kill', { src: 1, dst: 2, srcDef: 'hoplite', dstDef: 'hoplite', srcTeam: 0, dstTeam: 1, friendly: false, byPlayer: false, revived: false, cause: 'melee', x: 3, y: 0, z: 4 }); assert.equal(S.meta.qualKill, null);
  bus.emit('kill_streak', { id: 1, count: 5, def: 'hoplite' }); assert.equal(S.meta.qualKill.why, 'streak'); assert.deepEqual([S.meta.qualKill.x, S.meta.qualKill.z], [3, 4]);
}

// ---------------------------------------------------------------- funny stats ordering (the Results screen shows the first four)
{
  const rng = new RNG(1);
  const quiet = buildFunnyStats({ kills: 3, losses: 2, duration: 75 }, rng); assert.equal(quiet.length, 3, 'a quiet battle: duration, kills, losses'); assert.equal(quiet[0].value, '1:15');
  const loud = buildFunnyStats({ kills: 30, losses: 12, duration: 200, friendlyKills: 4, chickenKills: 2, kicks: 9, stoned: 3, trampleKills: 8, damage: 12345 }, rng);
  assert.equal(loud.length, 4); assert.equal(loud[3].value, '3:20', 'three funny rows, then the duration'); assert.equal(loud[0].value, '4', 'friendly kills lead'); assert.ok(loud.every((r) => !/^0$/.test(r.value)));
  assert.equal(buildFunnyStats({ survivorsCost: 12345.6 }, rng).find((r) => /dr$/.test(r.value)).value, '12,346 dr');
}
console.log('controllers OK');
