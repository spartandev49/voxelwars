// Unit: a plain, monomorphic object. Everything the renderer reads is public; the rest is sim-private.
import { N_SE, ST } from './consts.js';
import { DEFAULTS } from '../content/era_ancient/stats.js';

export class Unit {
  constructor(def, team, x, z, heading, id) {
    this.id = id;
    this.def = def;
    this.team = team;
    this.squad = null;
    // transform (renderer interpolates prev -> cur)
    this.x = x; this.y = 0; this.z = z;
    this.px = x; this.py = 0; this.pz = z;
    this.heading = heading; this.pheading = heading;
    this.pitch = 0; this.roll = 0;                 // used by flying corpses / launches
    this.vx = 0; this.vz = 0; this.kx = 0; this.kz = 0; this.ky = 0;
    this.dvx = 0; this.dvz = 0;                    // desired velocity (set by AI)
    this.face = heading;                           // desired facing
    // stats (copied from def so statuses can modify without touching shared data)
    this.hpMax = def.hp; this.hp = def.hp;
    this.alive = true; this.deadT = 0; this.deathKind = 0;
    this.radius = def.radius !== undefined ? def.radius : DEFAULTS.radius;
    this.mass = def.mass !== undefined ? def.mass : DEFAULTS.mass;
    this.scale = def.scale !== undefined ? def.scale : DEFAULTS.scale;
    this.height = (def.height !== undefined ? def.height : 2.5) * this.scale;
    this.speedBase = def.speed;                    // mutators may scale this
    // state machine
    this.state = ST.IDLE; this.stateT = 0; this.stateDur = 0; this.hitAt = 0; this.hitDone = false;
    this.atkKind = 0;                              // 0 melee, 1 ranged
    this.cd = 0;                                   // World.addUnit staggers the first attack with the sim RNG
    this.cdR = 0;                                  // ranged cooldown
    this.target = null; this.targetT = 0; this.claim = null; this.lineT = 0; this.lineOk = true;
    this.blockT = 0; this.sideSign = 1; this.waitT = 0; this.hasTok = false;
    this.sox = 0; this.soz = 0;                    // formation offset in squad frame
    this.aggro = 12; this.leash = 0;
    // animation request (sim -> renderer)
    this.anim = { clip: 'idle', t: 0, rate: 1, flinch: 0, dir: 0, prev: 'idle', blend: 1 };
    this.flash = 0;
    // statuses
    this.se = new Float32Array(N_SE);
    this.moraleMax = 100; this.morale = 100; this.routT = 0;
    // modifiers recomputed every tick: multipliers and additive bonuses
    this.mDmg = 1; this.mSpeed = 1; this.mArmor = 0; this.mBlock = 0; this.mProj = 0; this.mCd = 1; this.mDmgTaken = 1; this.mReach = 0;
    // charge / movement info
    this.speedNow = 0;
    this.kills = 0; this.dmgDealt = 0; this.dmgTaken = 0; this.lastAttacker = null;
    this.abil = null;                              // runtime ability states
    this.stone = 0;                                // 0..1 visual
    this.glow = 0;
    this.custom = null;                            // custom soldier data (blueprint, names)
    this.name = null;
    this.bark = 0;                                 // speech bubble cooldown
    this.gait = 0;                                 // walk-cycle phase accumulator (render)
    this.noRevive = false; this.revived = false;
    this.convertT = 0; this.origTeam = team;       // bribe conversion
    this.timeAlive = 0;
    this.vip = false; this.general = false;
    this.fireHits = 0;
    this.idleT = 0;                                // seconds stationary (throne)
    this.atkN = 0;
    this.controlled = false;                       // player-possessed (Take Command)
    this.altitude = 0;
    this.tauntSrc = null; this.lastHitT = -99; this.lastFlankT = -99;
    this.press = 0; this.claims = 0; this.engaged = false; this.hold = false; this.oppT = 0; this.kiteT = 0; this.mEnv = 1; this.rank = 0; this.focusT = 0;
    this.fleeX = 0; this.fleeZ = 0;
    this.routFrom = null;
    this.mutScale = 1;
  }
  get isRanged() { return !!this.def.ranged; }
}
