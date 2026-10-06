// Filmstrip / contact-sheet renderer for animation review.
//   node tools/filmstrip.mjs <fixture> <clip> [opts]        one strip (3/4 view + side view) -> docs/filmstrips/<fixture>_<clip>.png
//   node tools/filmstrip.mjs --sheet <category|all> [opts]  contact sheet(s) -> docs/filmstrips/sheet_<category>.png
//   node tools/filmstrip.mjs --list                          categories and clips
// opts: --frames N (default 10)  --ppu N (pixels per world unit, default 60)  --view both|q34|side  --weapon spear|sword|axe|club|bow|staff|none
//       --shield  --state '{"flinch":0.8,"dir":3.14,"prev":"walk","blend":0.5}'  --out path  --t0 s --t1 s  --quiet
// Renders through the real VoxSkin in headless Chromium (tools/shot_anim.mjs).
import { runJobs } from './shot_anim.mjs';

const HUM = (weapon, shield, extra = {}) => ({ fix: 'hum1', opts: Object.assign({ weapon, shield }, extra) });
const SOL = (main, off, extra = {}) => ({ fix: 'soldier', opts: Object.assign({ main, off }, extra) });   // real compileSoldier output
const SPEAR = SOL('dory', 'hoplon'), SWORD = SOL('gladius', 'scutum', { helm: 'galea' }), AXE = SOL('axe', 'none', { helm: 'horned' }), CLUB = SOL('club_big', 'none'), STAFF = SOL('scepter', 'none', { helm: 'laurel' }), BARE = SOL('none', 'none');
const BOW = HUM('bow', false, { back: 'quiver' });
const U = (b) => ({ fix: 'u:' + b, opts: {} });
const MOUNT = U('companion_cavalry'), HORSE = { fix: 'quad1', opts: {} }, CAMEL = U('camel_rider'), HOUND = U('warhound'), GOAT = U('battle_goat'), CHICKEN = U('sacred_chicken'), ELEPHANT = U('war_elephant'), CHARIOT = U('chariot_archer'), CATAPULT = U('catapult'), BALLISTA = U('ballista'), TROJAN = U('trojan_horse'), CENTAUR = U('centaur_archer');

// category -> [{clip, model, label?, frames?, state?, t0?, t1?}]
export const SETS = {
  locomotion: [
    { clip: 'idle', model: SPEAR }, { clip: 'idle_combat', model: SPEAR }, { clip: 'walk', model: SPEAR, speed: 2.4 }, { clip: 'jog', model: SPEAR, speed: 3.8 }, { clip: 'run', model: SPEAR, speed: 5.6 },
    { clip: 'rout', model: SWORD, speed: 5 }, { clip: 'block_hold', model: SPEAR }, { clip: 'sit', model: BARE },
  ],
  melee: [
    { clip: 'strike_slash_1', model: SWORD }, { clip: 'strike_slash_2', model: SWORD }, { clip: 'strike_thrust', model: SPEAR }, { clip: 'strike_overhead', model: AXE },
    { clip: 'strike_bash', model: SWORD }, { clip: 'kick', model: SPEAR },
  ],
  ranged: [{ clip: 'shoot_bow', model: BOW }, { clip: 'throw', model: SPEAR }, { clip: 'cast', model: STAFF }],
  reactions: [
    { clip: 'hit_front', model: SWORD }, { clip: 'hit_back', model: SWORD }, { clip: 'block_hit', model: SPEAR }, { clip: 'stagger', model: SWORD }, { clip: 'stun', model: SWORD },
    { clip: 'dizzy', model: SWORD }, { clip: 'cower', model: SWORD }, { clip: 'taunt', model: SPEAR }, { clip: 'cheer', model: SPEAR }, { clip: 'getup', model: SWORD },
  ],
  deaths: [{ clip: 'death_back', model: SWORD }, { clip: 'death_front', model: SWORD }, { clip: 'death_spin', model: SWORD }],
  mounts: [
    { clip: 'idle', model: MOUNT }, { clip: 'walk', model: MOUNT, speed: 1.5 }, { clip: 'trot', model: MOUNT, speed: 3.6 }, { clip: 'gallop', model: MOUNT, speed: 9 }, { clip: 'strike_thrust', model: MOUNT }, { clip: 'shoot_bow', model: MOUNT },
    { clip: 'rear', model: MOUNT }, { clip: 'stagger', model: MOUNT }, { clip: 'death_back', model: MOUNT }, { clip: 'death_front', model: MOUNT },
  ],
  beasts: [
    { clip: 'idle', model: HORSE }, { clip: 'walk', model: HORSE, speed: 1.5 }, { clip: 'trot', model: HORSE, speed: 3.6 }, { clip: 'gallop', model: HORSE, speed: 9 }, { clip: 'rear', model: HORSE }, { clip: 'stagger', model: HORSE },
    { clip: 'death_back', model: HORSE }, { clip: 'death_front', model: HORSE }, { clip: 'death_spin', model: HORSE },
  ],
  hound: [{ clip: 'idle', model: HOUND }, { clip: 'trot', model: HOUND, speed: 3.3 }, { clip: 'gallop', model: HOUND, speed: 7 }, { clip: 'strike_bite', model: HOUND }, { clip: 'death_back', model: HOUND }],
  goat: [{ clip: 'idle', model: GOAT }, { clip: 'trot', model: GOAT, speed: 3.5 }, { clip: 'gallop', model: GOAT, speed: 7 }, { clip: 'strike_headbutt', model: GOAT }, { clip: 'death_back', model: GOAT }],
  camel: [{ clip: 'idle', model: CAMEL }, { clip: 'walk', model: CAMEL, speed: 1.5 }, { clip: 'trot', model: CAMEL, speed: 3.5 }, { clip: 'gallop', model: CAMEL, speed: 9 }, { clip: 'death_back', model: CAMEL }],
  elephant: [{ clip: 'idle', model: ELEPHANT }, { clip: 'walk', model: ELEPHANT, speed: 3.2 }, { clip: 'run', model: ELEPHANT, speed: 6.4 }, { clip: 'strike_gore', model: ELEPHANT }, { clip: 'strike_stomp', model: ELEPHANT }, { clip: 'trumpet', model: ELEPHANT }, { clip: 'death_back', model: ELEPHANT }],
  chicken: [{ clip: 'idle', model: CHICKEN }, { clip: 'walk', model: CHICKEN, speed: 1.6 }, { clip: 'gallop', model: CHICKEN, speed: 4.6 }, { clip: 'strike_peck', model: CHICKEN }, { clip: 'flap', model: CHICKEN }, { clip: 'tantrum', model: CHICKEN }, { clip: 'death_back', model: CHICKEN }],
  ual: [
    { clip: 'ual_idle', model: SWORD }, { clip: 'ual_idle_combat', model: SWORD }, { clip: 'ual_strike_slash_1', model: SWORD }, { clip: 'ual_strike_slash_2', model: SWORD }, { clip: 'ual_strike_thrust', model: SPEAR },
    { clip: 'ual_strike_overhead', model: AXE }, { clip: 'ual_strike_bash', model: SWORD }, { clip: 'ual_throw', model: SPEAR }, { clip: 'ual_cast', model: STAFF }, { clip: 'ual_hit_front', model: SWORD },
    { clip: 'ual_death_back', model: SWORD }, { clip: 'ual_getup', model: SWORD }, { clip: 'ual_block_hold', model: SWORD }, { clip: 'ual_sit', model: BARE },
  ],
  siege: [{ clip: 'gallop', model: CHARIOT, speed: 9 }, { clip: 'shoot_bow', model: CHARIOT }, { clip: 'death_back', model: CHARIOT }, { clip: 'launch', model: CATAPULT }, { clip: 'walk', model: CATAPULT, speed: 1.2 }, { clip: 'death_back', model: CATAPULT },
    { clip: 'launch', model: BALLISTA }, { clip: 'strike_ram', model: TROJAN }, { clip: 'reveal', model: TROJAN }, { clip: 'death_back', model: TROJAN }],
};

// [cellWidth, rowHeight] in world units per fixture (frames are framed so the whole model fits)
const DIMS = { soldier: [3.0, 4.0], hum1: [3.0, 4.0], hum_lite: [3.0, 4.0], quad1: [4.6, 3.6], 'u:companion_cavalry': [4.8, 4.8], 'u:camel_rider': [5, 5.2], 'u:warhound': [3.0, 1.9], 'u:battle_goat': [3.2, 2.2], 'u:sacred_chicken': [1.6, 1.4],
  'u:war_elephant': [9.0, 8.4], 'u:trojan_horse': [8.5, 6.4], 'u:chariot_archer': [7.0, 4.6], 'u:catapult': [7.0, 5.2], 'u:ballista': [6.5, 4.6], 'u:centaur_archer': [4.8, 4.4] };
const dimsOf = (fix) => DIMS[fix] || [4.6, 4.2];
function sheetDims(rows, cols, maxW = 1750) {
  let cw = 0, rh = 0;
  for (const r of rows) { const d = dimsOf(r.model.fix); cw = Math.max(cw, d[0]); rh = Math.max(rh, d[1]); }
  return { cellW: cw, rowH: rh, ppu: Math.min(64, Math.floor(maxW / (cols * cw))) };
}
function parseArgs(argv) {
  const a = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const s = argv[i];
    if (s.startsWith('--')) {
      const k = s.slice(2);
      if (['shield', 'quiet', 'list', 'all', 'noweapon', 'ref'].includes(k)) a.flags[k] = true;
      else a.flags[k] = argv[++i];
    } else a._.push(s);
  }
  return a;
}

function row(label, spec, view, frames, extra = {}) {
  return Object.assign({ label, model: spec.model, clip: spec.clip, view, frames, speed: spec.speed || 0, state: spec.state, team: 'a' }, extra);
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const f = a.flags;
  const frames = +(f.frames || 10), ppu = +(f.ppu || 60);
  if (f.list) { for (const k of Object.keys(SETS)) console.log(k + ': ' + SETS[k].map((c) => c.clip).join(', ')); return; }
  const jobs = [];
  if (f.sheet) {
    const cats = f.sheet === 'all' ? Object.keys(SETS) : [f.sheet];
    for (const cat of cats) {
      const set = SETS[cat]; if (!set || !set.length) { console.log('sheet ' + cat + ': nothing defined yet'); continue; }
      const rows = set.map((s) => row(s.clip, s, f.view === 'side' ? 'side' : 'q34', s.frames || +(f.frames || 9)));
      const cols = +(f.frames || 9), sd = sheetDims(rows, cols);
      jobs.push({ out: `docs/filmstrips/sheet_${cat}.png`, title: `${cat}  (red = hit frame, yellow = recover)`, ppu: +(f.ppu || sd.ppu), cellW: sd.cellW, rowH: sd.rowH, cols, labelW: 120, rows });
    }
  } else {
    let [fix, clip] = a._;
    const outName = fix;
    if (fix === 'hum1' && !f.ref) fix = 'soldier';          // the real compileSoldier models; --ref = the hum1_ref fixture
    if (!fix || !clip) { console.error('usage: filmstrip.mjs <fixture> <clip> | --sheet <category|all> | --list'); process.exit(1); }
    const defaults = { sword: SWORD, spear: SPEAR, axe: AXE, club: CLUB, bow: BOW, staff: STAFF, none: BARE };
    let model;
    if (fix === 'hum1' || fix === 'soldier') {
      const w = f.weapon || ({ strike_thrust: 'spear', kick: 'spear', ride_strike: 'spear', shoot_bow: 'bow', ride_shoot: 'bow', throw: 'spear', cast: 'staff', strike_overhead: 'axe' }[clip] || 'sword');
      model = f.noweapon ? BARE : (defaults[w] || SWORD);
      if (fix === 'hum1' || f.ref) model = f.noweapon ? HUM('none', false) : HUM(w === 'sword' || w === 'spear' ? w : w, ['sword', 'spear'].includes(w), w === 'bow' ? { back: 'quiver' } : {});
    } else if (fix === 'mounted') model = MOUNT; else model = { fix, opts: {} };
    const state = f.state ? JSON.parse(f.state) : undefined;
    const defSpeed = { walk: 2.4, jog: 3.8, run: 5.6, trot: 4.0, gallop: 7.5, rout: 5.0 }[clip] || 0;
    const spec = { clip, model, state, speed: +(f.speed || defSpeed) };
    const rows = [];
    const views = f.view === 'q34' ? ['q34'] : f.view === 'side' ? ['side'] : ['q34', 'side'];
    for (const v of views) rows.push(row(`${clip}\n${v === 'q34' ? '3/4' : 'side'}`, spec, v, frames, { t0: f.t0 !== undefined ? +f.t0 : undefined, t1: f.t1 !== undefined ? +f.t1 : undefined }));
    const dm = dimsOf(fix);
    jobs.push({ out: f.out || `docs/filmstrips/${outName.replace(':', '_')}_${clip}.png`, title: `${fix}: ${clip}`, ppu: f.ppu ? ppu : Math.min(60, Math.floor(1700 / (frames * dm[0]))), cellW: dm[0], rowH: dm[1], cols: frames, labelW: 100, rows });
  }
  await runJobs(jobs, { quiet: !!f.quiet });
  for (const j of jobs) console.log('wrote ' + j.out);
}
main();
