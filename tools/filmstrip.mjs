// Filmstrip / contact-sheet renderer for animation review.
//   node tools/filmstrip.mjs <fixture> <clip> [opts]        one strip (3/4 view + side view) -> docs/filmstrips/<fixture>_<clip>.png
//   node tools/filmstrip.mjs --sheet <category|all> [opts]  contact sheet(s) -> docs/filmstrips/sheet_<category>.png
//   node tools/filmstrip.mjs --list                          categories and clips
// opts: --frames N (default 10)  --ppu N (pixels per world unit, default 60)  --view both|q34|side  --weapon spear|sword|axe|club|bow|staff|none
//       --shield  --state '{"flinch":0.8,"dir":3.14,"prev":"walk","blend":0.5}'  --out path  --t0 s --t1 s  --quiet
// Renders through the real VoxSkin in headless Chromium (tools/shot_anim.mjs).
import { runJobs } from './shot_anim.mjs';

const HUM = (weapon, shield, extra = {}) => ({ fix: 'hum1', opts: Object.assign({ weapon, shield }, extra) });
const SPEAR = HUM('spear', true), SWORD = HUM('sword', true), AXE = HUM('axe', false), CLUB = HUM('club', false), BOW = HUM('bow', false, { back: 'quiver' }), STAFF = HUM('staff', false), BARE = HUM('none', false);
const MOUNT = { fix: 'mounted', opts: {} };
const HORSE = { fix: 'quad1', opts: {} };

// category -> [{clip, model, label?, frames?, state?, t0?, t1?}]
export const SETS = {
  locomotion: [
    { clip: 'idle', model: SPEAR }, { clip: 'idle_combat', model: SPEAR }, { clip: 'walk', model: SPEAR, speed: 2.6 }, { clip: 'run', model: SPEAR, speed: 4.6 },
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
    { clip: 'idle', model: MOUNT }, { clip: 'trot', model: MOUNT, speed: 4 }, { clip: 'gallop', model: MOUNT, speed: 7.5 }, { clip: 'strike_thrust', model: MOUNT }, { clip: 'shoot_bow', model: MOUNT },
    { clip: 'rear', model: MOUNT }, { clip: 'death_back', model: MOUNT },
  ],
  beasts: [
    { clip: 'idle', model: HORSE }, { clip: 'walk', model: HORSE }, { clip: 'trot', model: HORSE }, { clip: 'gallop', model: HORSE }, { clip: 'rear', model: HORSE }, { clip: 'strike_bite', model: HORSE }, { clip: 'death_back', model: HORSE },
  ],
  siege: [],
};

function parseArgs(argv) {
  const a = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const s = argv[i];
    if (s.startsWith('--')) {
      const k = s.slice(2);
      if (['shield', 'quiet', 'list', 'all', 'noweapon'].includes(k)) a.flags[k] = true;
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
      const wide = set.some((s) => s.model.fix !== 'hum1');
      const cellW = wide ? 4.6 : 3.0;
      jobs.push({ out: `docs/filmstrips/sheet_${cat}.png`, title: `${cat}  (red = hit frame, yellow = recover)`, ppu: +(f.ppu || (wide ? 40 : 52)), cellW, rowH: wide ? 4.2 : 4.0, cols: +(f.frames || 9), labelW: 120, rows });
    }
  } else {
    const [fix, clip] = a._;
    if (!fix || !clip) { console.error('usage: filmstrip.mjs <fixture> <clip> | --sheet <category|all> | --list'); process.exit(1); }
    const defaults = { sword: SWORD, spear: SPEAR, axe: AXE, club: CLUB, bow: BOW, staff: STAFF, none: BARE };
    let model;
    if (fix === 'hum1') {
      const w = f.weapon || ({ strike_thrust: 'spear', kick: 'spear', ride_strike: 'spear', shoot_bow: 'bow', ride_shoot: 'bow', throw: 'spear', cast: 'staff', strike_overhead: 'axe' }[clip] || 'sword');
      model = f.noweapon ? BARE : (defaults[w] ? HUM(w, f.shield !== undefined || ['sword', 'spear'].includes(w) ? true : false, w === 'bow' ? { back: 'quiver' } : {}) : SWORD);
      if (f.shield === undefined && (w === 'axe' || w === 'club' || w === 'bow' || w === 'staff')) model = HUM(w, false, w === 'bow' ? { back: 'quiver' } : {});
    } else if (fix === 'mounted') model = MOUNT; else model = { fix, opts: {} };
    const state = f.state ? JSON.parse(f.state) : undefined;
    const spec = { clip, model, state, speed: +(f.speed || 0) };
    const wide = fix !== 'hum1';
    const rows = [];
    const views = f.view === 'q34' ? ['q34'] : f.view === 'side' ? ['side'] : ['q34', 'side'];
    for (const v of views) rows.push(row(`${clip}\n${v === 'q34' ? '3/4' : 'side'}`, spec, v, frames, { t0: f.t0 !== undefined ? +f.t0 : undefined, t1: f.t1 !== undefined ? +f.t1 : undefined }));
    jobs.push({ out: f.out || `docs/filmstrips/${fix}_${clip}.png`, title: `${fix}: ${clip}`, ppu, cellW: wide ? 4.6 : 3.0, rowH: wide ? 4.2 : 4.0, cols: frames, labelW: 100, rows });
  }
  await runJobs(jobs, { quiet: !!f.quiet });
  for (const j of jobs) console.log('wrote ' + j.out);
}
main();
