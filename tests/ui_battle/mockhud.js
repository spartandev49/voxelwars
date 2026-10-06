// mockhud.js: a fake Game + animated HudData generator for the battle-side UI (HUD modules and screens), built on UI-A's mock Ctx
// (real unit stats/factions/arena generator, kit-backed modal/toast). Everything here is test scaffolding: it is not shipped.
//   const m = createBattleMock({ seed: 7 });  m.ctx / m.game / m.router
//   m.game.update(dt) advances the fake battle; m.game.hud() returns the HudData the real Game would (extended shape documented in
//   docs/requests/ui-b.md); m.game.calls records every Game method the UI called so tests can assert visible effects.
import { createMockApp } from '../../src/ui/mockctx.js';
import { generateArena } from '../../src/world/gen.js';
import { MATERIALS } from '../../src/world/arena.js';
import { mulberry } from '../../src/ui/hud/_dom.js';

export const WORLD = { w: 96, d: 96 };

/* ------------------------------------------------------------------ sample copy standing in for HUMOR's content */
export const KILL_VERBS = {
  melee: ['bonked', 'perforated', 'philosophised at', 'mildly inconvenienced'], ranged: ['perforated', 'ventilated', 'sent a strongly worded arrow to'],
  aoe: ['flattened', 'rearranged'], fire: ['toasted', 'over-seasoned'], trample: ['trampled', 'stepped on, apologetically'], magic: ['zapped', 'smote'],
  stone: ['turned to stone', 'made a statue of'], kick: ['yeeted', 'punted into next week'], default: ['defeated'],
};
const ANNOUNCER = [
  { t: 0.6, who: 'brutus', text: 'WELCOME to the arena, citizens! Today’s carnage is brought to you by Pompeii Pizza, now with 20% more ASH!' },
  { t: 7, who: 'plato', text: 'If a spear meets a shield, which of them has lost? Please do not answer.' },
  { t: 13, who: 'brutus', text: 'WHAT a flank! I did not see that coming and neither did THEY!', chain: [{ who: 'plato', text: 'Is it a flank, or merely the side?' }, { who: 'cassandra', text: 'The side. I said it would be the side.' }] },
  { t: 24, who: 'cassandra', text: 'Those archers are standing in front of the spears. I mentioned this in the placement phase.' },
  { t: 33, who: 'brutus', text: 'Sparta-cus! No, Sparta! The Spartan! Whoever he is, he is KICKING things!' },
  { t: 44, who: 'plato', text: 'Notice the cavalry. Horses understand the war less than we do, and are happier.' },
  { t: 56, who: 'cassandra', text: 'The left flank will fold. Nobody listens. As foretold.' },
];
const NAMES = ['Sir Chadius the Unbothered', 'Dame Olga of the Second Lunch', 'Citizen Brutus Who Forgot His Shield', 'Doctor Nikos the Mildly Concerned', 'Probably Aristo', 'Lord Fabius Slayer of Chickens (Allegedly)'];
const A_ARMY = [['hoplite', 60], ['spartan', 18], ['peltast', 30], ['cretan_archer', 38], ['companion_cavalry', 14], ['philosopher', 6], ['strategos', 1]];
const B_ARMY = [['immortal', 46], ['sparabara', 34], ['cataphract', 16], ['camel_rider', 14], ['nubian_archer', 0], ['xerxes', 1]];

/* ------------------------------------------------------------------ campaign sample content (mission shape from spec/world.md section 6) */
const V = (who, text) => ({ who, text });
export const MISSIONS = [
  { id: 'marathon_sort_of', act: 1, index: 0, title: 'Marathon (Sort Of)', blurb: 'A plain, an olive tree, and an enemy with strong opinions about being on your plain.', arena: { recipe: 'marathon', size: 'medium', seed: 101 }, factionA: 'hellenes', factionB: 'persians', budget: 3000, units: { A: 30, B: 28 }, par: 2250, objective: { type: 'eliminate', text: 'Defeat the Persian army' }, timeLimit: 0, rules: ['Normal difficulty', 'Spears hold the line', 'Teaching hints on (skippable)'],
    briefing: [V('brutus', 'CITIZENS! The Persians have landed at Marathon, which is a plain, and also a snack.'), V('plato', 'Notice your options: spears, archers, and a God Power you have not yet paid for.'), V('cassandra', 'Put spears in front. I will say this once. Nobody will listen.')],
    stars: [{ id: 'win', text: 'Win the battle' }, { id: 'half', text: 'Win with half your army (by cost) still standing' }, { id: 'par', text: 'Win while spending under 2,250 drachmae' }], rewards: { title: 'Marathoner', unlockMutators: ['big_heads'] } },
  { id: 'thermopylae_snack', act: 1, index: 1, title: 'The 300 Slightly Overweight Spartans', blurb: 'A narrow pass, a stone wall, and a lot of confidence about both.', arena: { recipe: 'thermopylae', size: 'medium', seed: 102 }, factionA: 'hellenes', factionB: 'persians', budget: 6000, units: { A: 45, B: 70 }, par: 4800, objective: { type: 'hold_hill', text: 'Hold the gates for 120 seconds' }, timeLimit: 150, rules: ['Persian waves x4', 'Hold the hill 120 s', 'Choke point'],
    briefing: [V('brutus', 'The HOT GATES! Eight units wide and ten thousand units of OPINION!'), V('plato', 'If a wall is held by people, is it still a wall?'), V('cassandra', 'They will come in waves. Four. I said four.')],
    stars: [{ id: 'win', text: 'Hold the pass' }, { id: 'half', text: 'Keep half your army (by cost)' }, { id: 'spartan', text: 'Lose no Spartan' }], rewards: { title: 'Hot Gater' } },
  { id: 'pyramid_scheme', act: 1, index: 2, title: 'Pyramid Scheme', blurb: 'Dunes, pyramids as cover, and a Pharaoh who is very good at hiding in plain sight.', arena: { recipe: 'giza', size: 'medium', seed: 103 }, factionA: 'romans', factionB: 'egyptians', budget: 7500, units: { A: 55, B: 60 }, par: 0, objective: { type: 'kill_general', text: 'Defeat the Pharaoh' }, timeLimit: 240, rules: ['Kill the general', 'Sand slows everyone by 12%'],
    briefing: [V('brutus', 'Giza! Big triangles! Bigger hats!'), V('plato', 'He is a god. He bleeds. Philosophically interesting.'), V('cassandra', 'He will run. Chase him anyway.')],
    stars: [{ id: 'win', text: 'Defeat the Pharaoh' }, { id: 'half', text: 'Keep half your army (by cost)' }, { id: 'fast', text: 'Defeat him in under 90 seconds' }], rewards: { title: 'Pyramid Schemer' } },
  { id: 'nile_crossing', act: 2, index: 3, title: 'Goat Across the Nile', blurb: 'The goat has somewhere to be. The river has other plans.', arena: { recipe: 'nile', size: 'medium', seed: 104 }, factionA: 'egyptians', factionB: 'barbarians', budget: 6500, units: { A: 50, B: 55 }, par: 0, objective: { type: 'protect_vip', text: 'Get the goat to the far bank' }, timeLimit: 100, rules: ['Protect the VIP goat', 'One ford'],
    briefing: [V('brutus', 'THE GOAT! Our hero! Our VIP! Our spiritual leader!'), V('plato', 'The goat does not consent to philosophy.'), V('cassandra', 'The goat will be fine. The rest of you, less so.')],
    stars: [{ id: 'win', text: 'Goat reaches the exit' }, { id: 'half', text: 'Keep half your army (by cost)' }, { id: 'unhurt', text: 'The goat takes no damage' }], rewards: { title: 'Goat Herder' } },
  { id: 'alps_elephant', act: 2, index: 4, title: 'Hannibal Ante Portas', blurb: 'Elephants in snow. The elephants have notes.', arena: { recipe: 'alpine', size: 'medium', seed: 105 }, factionA: 'carthage', factionB: 'romans', budget: 11000, units: { A: 60, B: 75 }, par: 0, objective: { type: 'eliminate', text: 'Defeat the Roman army' }, timeLimit: 0, rules: ['Snow slows everyone by 10%', 'Elephants!'],
    briefing: [V('brutus', 'ELEPHANTS! In the ALPS! Somebody check the paperwork!'), V('plato', 'Do elephants fear mice? Do mice fear philosophy?'), V('cassandra', 'Fire. They fear fire. I said that last time too.')],
    stars: [{ id: 'win', text: 'Win the battle' }, { id: 'half', text: 'Keep half your army (by cost)' }, { id: 'ele', text: 'Win with at least one elephant alive' }], rewards: { title: 'Alps Alpinist' } },
  { id: 'teutoburg_peekaboo', act: 2, index: 5, title: 'Teutoburg Hide and Seek', blurb: 'Fog, mud, trees, and a column of Romans who were told this would be quick.', arena: { recipe: 'teutoburg', size: 'medium', seed: 106 }, factionA: 'barbarians', factionB: 'romans', budget: 7500, units: { A: 50, B: 80 }, par: 0, objective: { type: 'kill_general', text: 'Defeat the Centurion' }, timeLimit: 200, rules: ['Fog reduces ranged accuracy', 'Ambush from the trees'],
    briefing: [V('brutus', 'FOG! MUD! A Roman column that has made some CHOICES!'), V('plato', 'To see, or not to be seen. Mostly the latter.'), V('cassandra', 'They will not look up. Nobody ever looks up.')],
    stars: [{ id: 'win', text: 'Defeat the Centurion' }, { id: 'half', text: 'Keep half your army (by cost)' }, { id: 'fast', text: 'Win in under 75 seconds' }], rewards: { title: 'Forest Phantom' } },
  { id: 'troy_giftshop', act: 3, index: 6, title: 'Siege of Troy (Gift Shop Not Included)', blurb: 'A wall, a gate, a horse. What could possibly be in the horse.', arena: { recipe: 'troy', size: 'medium', seed: 107 }, factionA: 'hellenes', factionB: 'trojans', budget: 10000, units: { A: 70, B: 70 }, par: 0, objective: { type: 'destroy', text: 'Break both gates, then defeat the defenders' }, timeLimit: 300, rules: ['Destroy gate_door x2', 'Trojan Horse available'],
    briefing: [V('brutus', 'TROY! A very big wall and a very small budget for walls!'), V('plato', 'Is a gift a gift if it opens from the inside?'), V('cassandra', 'Do not accept the horse. Oh. You are the horse people.')],
    stars: [{ id: 'win', text: 'Win the battle' }, { id: 'half', text: 'Keep half your army (by cost)' }, { id: 'gate', text: 'Break the gate in under 100 seconds' }], rewards: { title: 'Gift Shop Manager' } },
  { id: 'cyclops_meet', act: 3, index: 7, title: 'Cyclops Isle Meet-and-Greet', blurb: 'One eye, zero depth perception, many goats.', arena: { recipe: 'cyclops', size: 'medium', seed: 108 }, factionA: 'hellenes', factionB: 'mythic', budget: 8000, units: { A: 55, B: 20 }, par: 0, objective: { type: 'kill_general', text: 'Defeat the Cyclops' }, timeLimit: 240, rules: ['Boss: Cyclops', 'Boulders miss. Mostly.'],
    briefing: [V('brutus', 'THE CYCLOPS! He sees EVERYTHING! Slightly to the left of everything!'), V('plato', 'If one eye sees one thing, does it see half of two?'), V('cassandra', 'He will miss. Do not stand where he missed.')],
    stars: [{ id: 'win', text: 'Defeat the Cyclops' }, { id: 'half', text: 'Keep half your army (by cost)' }, { id: 'ff', text: 'No friendly fire' }], rewards: { title: 'Cyclops Whisperer' } },
  { id: 'zeus_bad_day', act: 3, index: 8, title: 'Zeus Has a Bad Day', blurb: 'Mount Olympus. Four waves of myths. One very tired god.', arena: { recipe: 'olympus', size: 'medium', seed: 109 }, factionA: 'mixed', factionB: 'mythic', budget: 15000, units: { A: 90, B: 100 }, par: 0, objective: { type: 'survive_waves', text: 'Survive 4 mythic waves' }, timeLimit: 0, rules: ['4 waves', 'Zeus lightning hazard', 'Any faction'],
    briefing: [V('brutus', 'OLYMPUS! The big one! The finale! Please do not look at Zeus.'), V('plato', 'Suppose a god has a bad day. Whose day is it, really?'), V('cassandra', 'He will strike twice. Then storm off. As foretold.')],
    stars: [{ id: 'win', text: 'Survive all waves' }, { id: 'half', text: 'Keep half your army (by cost)' }, { id: 'hero', text: 'Lose no hero' }], rewards: { title: 'Zeus’ Therapist' } },
];

/* ------------------------------------------------------------------ terrain colour map (real arena generator, like UI-A's thumbnails) */
export function terrainRGBA(seed, n = 128) {
  const a = generateArena('marathon', 'small', seed || 1);
  const data = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const cx = Math.min(a.size - 1, Math.floor((x / n) * a.size)), cz = Math.min(a.size - 1, Math.floor((y / n) * a.size));
    const m = MATERIALS[a.getM(cx, cz)] || MATERIALS[0];
    const c = m.top[(cx + cz) % 3], hh = a.getH(cx, cz), east = a.getH(Math.min(a.size - 1, cx + 1), cz);
    const shade = 1 + (hh - east) * 0.06 + (hh - 8) * 0.012;
    const i = (y * n + x) * 4;
    data[i] = Math.max(0, Math.min(255, ((c >> 16) & 255) * shade)); data[i + 1] = Math.max(0, Math.min(255, ((c >> 8) & 255) * shade)); data[i + 2] = Math.max(0, Math.min(255, (c & 255) * shade)); data[i + 3] = 255;
  }
  return { w: n, h: n, data };
}

/* ------------------------------------------------------------------ the fake battle */
class FakeBattle {
  constructor(game, seed) {
    this.g = game; this.rnd = mulberry(seed || 1); this.reset();
  }
  reset() {
    const u = this.g.ctx.content.units;
    const mk = (list) => list.filter(([id]) => u[id]).map(([id, n]) => ({ defId: id, start: n, alive: n, cost: u[id].cost }));
    this.T = [mk(A_ARMY), mk(B_ARMY)];
    this.time = 0; this.annIdx = 0; this.feed = []; this.fid = 0; this.ann = null; this.annT = 0; this.objP = 0;
    this.winner = -2;
    this.pos = [];
    const n0 = this.T[0].reduce((s, t) => s + t.start, 0), n1 = this.T[1].reduce((s, t) => s + t.start, 0);
    this.dots = new Float32Array((n0 + n1 + 4) * 3);
    this.seedPos(n0, n1);
  }
  seedPos(n0, n1) {
    const r = this.rnd;
    this.pos.length = 0;
    for (let i = 0; i < n0; i++) this.pos.push({ x: -34 + r() * 12, z: -24 + r() * 48, t: 0, kind: i % 40 === 0 ? 1 : 0 });
    for (let i = 0; i < n1; i++) this.pos.push({ x: 22 + r() * 12, z: -24 + r() * 48, t: 1, kind: i % 40 === 0 ? 1 : 0 });
    this.pos[0].kind = 3;
  }
  total(t, k) { return this.T[t].reduce((s, x) => s + (k === 'cost' ? x.alive * x.cost : k === 'start' ? x.start : k === 'startCost' ? x.start * x.cost : x.alive), 0); }
  step(dt) {
    if (this.winner !== -2) return;
    this.time += dt;
    const r = this.rnd, sA = this.total(0, 'cost'), sB = this.total(1, 'cost');
    const ramp = Math.min(1, this.time / 10);
    for (let team = 0; team < 2; team++) {
      const enemy = sB && sA ? (team === 0 ? sB / Math.max(1, sA) : sA / Math.max(1, sB)) : 1;
      const lam = 3.2 * ramp * Math.sqrt(enemy) * dt;       // expected deaths this step on `team`
      let deaths = Math.floor(lam) + (r() < lam % 1 ? 1 : 0);
      while (deaths-- > 0) {
        const alive = this.T[team].filter((x) => x.alive > 0); if (!alive.length) break;
        const t = alive[Math.floor(r() * alive.length)]; t.alive--;
        const killers = this.T[1 - team].filter((x) => x.alive > 0); if (!killers.length) continue;
        const k = killers[Math.floor(r() * killers.length)];
        this.pushFeed(1 - team, k.defId, t.defId, team);
      }
    }
    this.objP = Math.min(1, this.objP + (this.time > 6 ? dt / 120 : 0));
    // announcer script
    const nx = ANNOUNCER[this.annIdx];
    if (nx && this.time >= nx.t) { this.annIdx++; this.annT++; this.ann = { who: nx.who, text: nx.text, t: this.annT, chain: nx.chain }; this.g.emit('announce', this.ann); }
    // positions drift toward the middle
    for (const p of this.pos) { const dir = p.t === 0 ? 1 : -1; p.x += dir * dt * (0.4 + r() * 0.9) * ramp; p.z += (r() - 0.5) * dt * 3; if (p.x > 30) p.x = 30; if (p.x < -30) p.x = -30; }
    if (this.total(0) < 4 || this.total(1) < 4) this.winner = this.total(0) >= this.total(1) ? 0 : 1;
  }
  pushFeed(team, src, dst, dstTeam) {
    const u = this.g.ctx.content.units;
    const causes = Object.keys(KILL_VERBS).filter((c) => c !== 'default');
    const cause = causes[Math.floor(this.rnd() * causes.length)];
    const verbs = KILL_VERBS[cause];
    const verb = verbs[Math.floor(this.rnd() * verbs.length)];
    const sn = (u[src] && u[src].name) || src, dn = (u[dst] && u[dst].name) || dst;
    this.feed.push({ t: this.time, team, verb, cause, key: ++this.fid, text: sn + ' ' + verb + ' ' + dn });
    if (this.feed.length > 5) this.feed.shift();
    void dstTeam;
  }
}

/* ------------------------------------------------------------------ the fake Game */
export const POWERS = [
  { id: 'zeus_lightning', name: 'Zeus’ Lightning', key: '1', cdMax: 20 }, { id: 'meteor', name: 'Meteor', key: '2', cdMax: 35 }, { id: 'earthquake', name: 'Earthquake', key: '3', cdMax: 30 },
  { id: 'heal_wave', name: 'Heal Wave', key: '4', cdMax: 25 }, { id: 'wine_rain', name: 'Wine Rain', key: '5', cdMax: 40 }, { id: 'raise_chickens', name: 'Raise Chickens', key: '6', cdMax: 45 },
];

function buildGame(ctx, opts) {
  const em = {};
  const g = {
    ctx, calls: [], state: 'running', paused: false, speed: 1, camMode: 'orbit', aiming: null, possessId: 0, selId: 0, hoverId: 0, camObject: !!opts.camObject, countdown: 0, _cd: [0, 0, 0, 0, 0, 0], mutators: opts.mutators || [], teaching: null, objective: opts.objective !== false,
    on(ev, fn) { (em[ev] || (em[ev] = [])).push(fn); return () => { em[ev] = (em[ev] || []).filter((f) => f !== fn); }; },
    emit(ev, p) { (em[ev] || []).slice().forEach((f) => f(p || {})); },
    log(name, ...args) { g.calls.push({ name, args }); },
    pause(b) { g.log('pause', b); g.paused = !!b; g.emit('pause', { paused: g.paused }); }, isPaused() { return g.paused; },
    setSpeed(s) { g.log('setSpeed', s); g.speed = s; g.emit('speed', { speed: s }); }, getSpeed() { return g.speed; },
    rematch() { g.log('rematch'); return Promise.resolve(); }, tweak() { g.log('tweak'); }, exitToMenu() { g.log('exitToMenu'); g.state = 'idle'; },
    killcam() { g.log('killcam'); return Promise.resolve(); },
    skipTeaching() { g.log('skipTeaching'); g.teaching = null; }, teachingNext() { g.log('teachingNext'); },
    fight() { g.log('fight'); g.state = 'countdown'; g.countdown = 3; g._cdT = 3; },
    camera: {
      mode: () => g.camMode,
      setMode(m) { g.log('camera.setMode', m); g.camMode = m; g.emit('camera', { mode: m }); },
      follow(id) { g.log('camera.follow', id); },
      jumpTo(x, z) { g.log('camera.jumpTo', Math.round(x), Math.round(z)); },
      photo: async () => { g.log('camera.photo'); return opts.photoUrl || makeShot(); },
    },
    select(id) { g.log('select', id); g.selId = id || 0; g.emit('select', { id: g.selId }); }, selected() { return g.selId; },
    command(c) { g.log('command', c); }, cast(p, x, z) { g.log('cast', p, Math.round(x), Math.round(z)); const i = POWERS.findIndex((q) => q.id === p); if (i >= 0) g._cd[i] = POWERS[i].cdMax; g.aiming = null; },
    aim(id) { g.log('aim', id); g.aiming = id; },
    possess(id) { g.log('possess', id); g.possessId = id || 0; },
    possessInput(patch) { g.log('possessInput', patch); },
    groundAt(x, y) { g.log('groundAt'); return { x: (x / window.innerWidth - 0.5) * 80, y: 0, z: (y / window.innerHeight - 0.5) * 80 }; },
    godPowers() { return POWERS.map((p, i) => ({ id: p.id, name: p.name, key: p.key, cd: g._cd[i], cdMax: p.cdMax, ready: g._cd[i] <= 0 })); },
    newSetup(kind, preset) { g.log('newSetup', kind); return Object.assign({ kind, arena: { presetId: 'marathon', size: 'medium', seed: 1, env: {} }, rules: { budget: 8000, mutators: [] }, armies: { A: { faction: 'hellenes', placements: [] }, B: { faction: 'persians', placements: [] } } }, preset || {}); },
    begin(setup) { g.log('begin', setup && setup.kind); g.setup = setup; g.state = 'placement'; g.emit('placement', {}); return Promise.resolve(); },
    tools: { setBrush(b) { g.log('tools.setBrush', b); g._brush = Object.assign(g._brush || {}, b); }, brush() { return g._brush || {}; }, undo() { g.log('tools.undo'); }, redo() {}, canUndo: () => true, canRedo: () => false, clear() {}, autoFill() {} },
    info: { budget: () => ({ spent: 2400, cap: 4000, left: 1600 }), counts: () => ({ total: 41, cap: 300, types: 5, typeCap: 16, byType: [] }), validity: () => null, scout: () => [] },
    update(dt) {
      g.battle.step(g.paused || g.state !== 'running' ? 0 : dt * g.speed);
      if (g.state === 'countdown') { g._cdT -= dt; g.countdown = Math.max(0, Math.ceil(g._cdT)); if (g._cdT <= 0) { g.state = 'running'; g.countdown = 0; g.emit('state', { state: 'running' }); } }
      if (g.state === 'running' && !g.paused) for (let i = 0; i < 6; i++) if (g._cd[i] > 0) g._cd[i] = Math.max(0, g._cd[i] - dt * g.speed);
      if (g.battle.winner !== -2 && g.state === 'running') { g.state = 'ended'; g.emit('battle_end', g.results()); }
    },
    hud() {
      const B = g.battle, u = ctx.content.units;
      const teams = [0, 1].map((t) => ({ team: t, name: t === 0 ? 'Hellenes' : 'Persians', alive: B.total(t), start: B.total(t, 'start'), cost: B.total(t, 'cost'), costStart: B.total(t, 'startCost'), byType: B.T[t].map((x) => ({ defId: x.defId, alive: x.alive, start: x.start })) }));
      let selection = null, hover = null;
      if (g.selId) selection = unitInfo(g.selId, 0);
      if (g.hoverId) hover = unitInfo(g.hoverId, 1);
      const n = B.pos.length;
      for (let i = 0; i < n; i++) { const p = B.pos[i]; B.dots[i * 3] = p.x; B.dots[i * 3 + 1] = p.z; B.dots[i * 3 + 2] = p.t + 2 * (p.kind || 0); }
      const cx = 0, cz = 0;
      const hud = {
        state: g.state, time: B.time, speed: g.speed, paused: g.paused, fps: 60, cam: g.camObject ? { mode: g.camMode, x: cx, z: cz } : g.camMode, teams, countdown: g.countdown,
        timeLimit: opts.timeLimit || 0,
        objective: g.objective ? { id: 'hold_hill', text: 'Hold the hill', progress: B.objP, state: B.objP >= 1 ? 'won' : 'active', detail: Math.round(B.objP * 120) + ' / 120 s', markers: [{ type: 'hill', label: 'Hill' }, { type: 'exit', label: 'Exit' }] } : null,
        killfeed: B.feed.slice(), announcer: B.ann, selection, hover, powers: g.godPowers(), orders: { current: g._order || null }, mutators: g.mutators,
        minimap: { world: WORLD, terrain: g.terrain, terrainVersion: 1, dots: B.dots, n, frustum: [-22, -8, 22, -8, 30, 20, -30, 20], zones: [{ team: 0, x: -30, z: 0, w: 14, d: 60 }, { team: 1, x: 30, z: 0, w: 14, d: 60 }], markers: [{ type: 'hill', x: 0, z: 0, r: 6 }] },
        possess: g.possessId ? { id: g.possessId, name: 'Sir Chadius the Unbothered', hp: 64, hpMax: 110, abilities: [{ id: 'bash', name: 'Shield Bash', key: '1', cd: 0, cdMax: 6, ready: true }, { id: 'kick', name: 'Kick', key: '2', cd: 4, cdMax: 8, ready: false }, { id: 'warcry', name: 'War Cry', key: '3', cd: 0, cdMax: 20, ready: true }] } : null,
        teaching: g.teaching,
        worldLabels: opts.labels ? opts.labels(B) : null,
      };
      void u;
      return hud;
    },
    results() { return makeResults(g, opts); },
  };
  function unitInfo(id, team) {
    const defs = ['spartan', 'hoplite', 'cretan_archer', 'immortal', 'philosopher', 'companion_cavalry'];
    const defId = defs[id % defs.length], u = ctx.content.units[defId] || {};
    return { id, defId, name: NAMES[id % NAMES.length], role: u.role, team: id % 2 ? 1 : team, squad: 3, hp: Math.round((u.hp || 100) * 0.62), hpMax: u.hp || 100, kills: 4 + (id % 5), status: id === 1 ? [] : ['burn', 'slow', { id: 'stun', t: 1.2 }], blurb: (u.text && u.text.blurb) || '' };
  }
  g.terrain = terrainRGBA(opts.seed || 1);
  g.battle = new FakeBattle(g, opts.seed || 1);
  return g;
}

function makeShot() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 180; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, '#79c2ff'); gr.addColorStop(1, '#8cc65a'); x.fillStyle = gr; x.fillRect(0, 0, 320, 180);
  x.fillStyle = '#2f6bff'; for (let i = 0; i < 30; i++) x.fillRect(30 + (i % 10) * 9, 100 + Math.floor(i / 10) * 9, 6, 8);
  x.fillStyle = '#e23b3b'; for (let i = 0; i < 30; i++) x.fillRect(200 + (i % 10) * 9, 100 + Math.floor(i / 10) * 9, 6, 8);
  return c.toDataURL('image/png');
}

/* ------------------------------------------------------------------ results data variants */
export function makeResults(g, opts) {
  const B = g.battle, kind = (opts && opts.resultsKind) || 'quick';
  const winner = opts && opts.winner !== undefined ? opts.winner : 0;
  const A = { name: 'Hellenes', alive: winner === 0 ? 87 : 0, dead: winner === 0 ? 85 : 172, kills: winner === 0 ? 125 : 61, damage: 14210, lostCost: winner === 0 ? 8450 : 17200, startCost: 17200, startCount: 172 };
  const Bt = { name: 'Persians', alive: winner === 1 ? 52 : 0, dead: winner === 1 ? 73 : 125, kills: winner === 1 ? 172 : 85, damage: 12980, lostCost: winner === 1 ? 7000 : 15800, startCost: 15800, startCount: 125 };
  const r = {
    winner, reason: 'elimination', time: Math.max(94, Math.round(B.time)), kind,
    teams: [A, Bt],
    mvp: { unit: { name: 'Sir Chadius the Unbothered', defId: 'spartan' }, kills: 14, quote: 'Tell my shield I loved it.' },
    funnyStats: [{ label: 'Arrows that found a friend', value: '12' }, { label: 'Chickens who joined the army', value: '3' }, { label: 'Times someone said "formation"', value: '41' }, { label: 'Longest chase of one unit by one other unit', value: '23 s' }, { label: 'Shields mildly disappointed in', value: '7' }],
    lessons: winner === 0 ? [
      { text: 'Your archers stood in front of your spears for 11 seconds. I said they would.', fix: 'Put spears in front, ranged behind.', who: 'cassandra' },
      { text: 'The Immortals flanked left and the left did not notice. Twice.', fix: 'Anchor a squad on each flank, or hold the hill.', who: 'cassandra' },
      { text: 'Your Meteor landed on empty grass. The grass is fine. The grass is thankful.', fix: 'Aim God Powers at clusters, not scenery.', who: 'cassandra' },
    ] : [
      { text: 'Your cavalry charged a spear wall. The spear wall was not impressed.', fix: 'Send cavalry at archers, not at spears.', who: 'cassandra' },
      { text: 'You were outnumbered 3 to 1 at the hill and stayed. I said to leave.', fix: 'Fall back and fight where your ranged units cover you.', who: 'cassandra' },
      { text: 'You never used a single God Power. The gods are offended, and also bored.', fix: 'Heal Wave at the front line wins fights.', who: 'cassandra' },
    ],
    canRematch: true, canNext: false, canKillcam: true,
  };
  if (kind === 'campaign') {
    const m = MISSIONS[1];
    r.mission = { id: m.id, title: m.title, act: m.act, index: m.index, next: MISSIONS[2].id, nextTitle: MISSIONS[2].title };
    r.stars = winner === 0 ? [{ id: 'win', text: m.stars[0].text, earned: true }, { id: 'half', text: m.stars[1].text, earned: true }, { id: 'spartan', text: m.stars[2].text, earned: false }] : [{ id: 'win', text: m.stars[0].text, earned: false }, { id: 'half', text: m.stars[1].text, earned: false }, { id: 'spartan', text: m.stars[2].text, earned: false }];
    r.rewards = winner === 0 ? { title: 'Hot Gater', unlockParts: ['Colander Helm'], unlockMutators: ['tiny_titans'], codex: ['Spartan: kicks recorded'] } : null;
    r.canNext = winner === 0;
  }
  if (kind === 'survival') {
    r.survival = { wave: 7, waveName: 'Wave 7: Mildly Annoyed Titans', score: 11230, kills: 233, remainingCost: 1860, best: 9100, rank: 1, board: [{ score: 11230, waves: 7, date: 'Today', arena: 'Marathon Plain' }, { score: 9100, waves: 6, date: '3 Oct', arena: 'Hot Gates' }, { score: 7400, waves: 5, date: '1 Oct', arena: 'Oasis Duel' }, { score: 5200, waves: 4, date: '28 Sep', arena: 'Marathon Plain' }, { score: 2100, waves: 2, date: '27 Sep', arena: 'Colosseum' }] };
    r.winner = 1;
  }
  if (kind === 'daily') {
    r.daily = { date: '2026-10-06', seed: 20261006, arena: 'Marathon Plain', resultString: 'VOXELWARS Daily 2026-10-06 | Marathon Plain | Hellenes vs Persians | WIN 1:46 | 51% left | seed 20261006' };
  }
  return r;
}

/* ------------------------------------------------------------------ a router that behaves like app/router.js (base + overlays) */
export function makeRouter(ui, getCtx, registry) {
  const R = { base: null, overlays: [], history: [], log: [] };
  const mount = (id, params, overlay) => {
    const mod = registry[id]; if (!mod) throw new Error('no screen ' + id);
    const el = document.createElement('div'); el.className = 'vw-screen vw-screen-' + id + (overlay ? ' vw-overlay' : ''); el.dataset.screen = id;
    el.style.cssText = 'position:absolute;inset:0;' + (((mod.meta && mod.meta.layer) === 'battle') ? 'pointer-events:none;' : 'pointer-events:auto;');
    ui.appendChild(el);
    const inst = mod.mount(el, getCtx(), params || {}) || {};
    return { id, el, inst, meta: mod.meta || {} };
  };
  const kill = (s) => { if (!s) return; try { s.inst.destroy && s.inst.destroy(); } catch (e) { console.error('destroy', e); } s.el.remove(); };
  R.goto = (id, params) => { R.log.push('goto:' + id); for (const o of R.overlays.splice(0)) kill(o); kill(R.base); R.base = mount(id, params, false); return true; };
  R.overlay = (id, params) => { R.log.push('overlay:' + id); const s = mount(id, params, true); R.overlays.push(s); return true; };
  R.closeOverlay = (id) => { R.log.push('close:' + id); for (let i = R.overlays.length - 1; i >= 0; i--) if (!id || R.overlays[i].id === id) { kill(R.overlays[i]); R.overlays.splice(i, 1); if (id) break; } };
  R.hasOverlay = (id) => R.overlays.some((o) => o.id === id);
  R.back = () => { if (R.overlays.length) { const top = R.overlays[R.overlays.length - 1]; if (top.inst.onBack && top.inst.onBack()) return true; R.closeOverlay(top.id); return true; } if (R.base && R.base.inst.onBack && R.base.inst.onBack()) return true; return false; };
  R.key = (e) => { const top = R.overlays[R.overlays.length - 1] || R.base; return !!(top && top.inst && top.inst.onKey && top.inst.onKey(e)); };
  R.current = () => (R.base ? R.base.id : '');
  R.destroy = () => { for (const o of R.overlays.splice(0)) kill(o); kill(R.base); R.base = null; };
  return R;
}

/* ------------------------------------------------------------------ assemble */
export function createBattleMock(opts) {
  opts = opts || {};
  const app = createMockApp({ registry: {}, touch: !!opts.touch, phone: opts.phone, noDownloads: !!opts.noDownloads, settings: opts.settings });
  const ctx = app.ctx;
  ctx.content.humor.killVerbs = KILL_VERBS;
  ctx.content.campaign = { missions: MISSIONS };
  ctx.game = buildGame(ctx, opts);
  const m = { app, ctx, game: ctx.game, router: null, calls: app.calls };
  const baseNav = ctx.nav;
  m.attachRouter = (ui, registry) => {
    m.router = makeRouter(ui, () => ctx, registry);
    ctx.nav = { goto: (id, p) => m.router.goto(id, p), back: () => m.router.back(), current: () => m.router.current(), overlay: (id, p) => m.router.overlay(id, p), closeOverlay: (id) => m.router.closeOverlay(id), hasOverlay: (id) => m.router.hasOverlay(id), modal: (o) => baseNav.modal(o), toast: (t, o) => { app.calls.toasts.push(t); return baseNav.toast(t, o); } };
    // main.js glue
    ctx.game.on('pause', (p) => { if (!p.paused) m.router.closeOverlay('pause'); });
    ctx.game.on('state', (p) => { if (p.state === 'running') m.router.closeOverlay('countdown'); });
    return m.router;
  };
  return m;
}
