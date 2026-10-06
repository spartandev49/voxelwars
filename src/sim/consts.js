// Shared sim constants and enums.
export const DT = 1 / 30;
export const TEAM_A = 0, TEAM_B = 1, TEAM_N = 2;

// unit states
export const ST = { IDLE: 0, MOVE: 1, WINDUP: 2, RECOVER: 3, STAGGER: 4, STUN: 5, CAST: 6, ROUT: 7, SIT: 8, CHEER: 9, GETUP: 10, FLY: 11 };

// status effect slots (float seconds remaining)
export const SE = {
  BURN: 0, SLOW: 1, STUN: 2, ROOT: 3, CONFUSE: 4, SLEEP: 5, STONE: 6, RAGE: 7, HASTE: 8, DMGUP: 9, CURSE: 10, SCARE: 11, TIPSY: 12, POISON: 13, DISARM: 14, TAUNT: 15,
};
export const N_SE = 16;
export const SE_NAMES = Object.keys(SE);

export const DAMAGE_TYPES = ['slash', 'pierce', 'blunt', 'fire', 'magic'];
export const AP = { slash: 0, pierce: 0.3, blunt: 0.2, fire: 1, magic: 1 };

// world gameplay tunables
export const G = {
  gravity: 22,
  groundFollow: 12,          // u/s unit vertical follow
  knockFriction: 6,
  critChance: 0.06, critMul: 2,
  backstabMul: 1.35, backstabArcCos: -0.5,   // attacker behind if dot(targetForward, toAttacker) < -0.5 (outside 120deg front arc)
  chargeDmg: 1.0, chargeKb: 1.5,
  braceMul: 1.6, braceArcCos: 0.64,          // 50 degrees
  trampleDps: 18, trampleMassMax: 3,
  moraleAllyDeath: 2, moraleFlanked: 6, moraleLowHp: 0.5, moraleOfficer: 1,
  routThreshold: 15, rallyThreshold: 40,
  armyCollapseFrac: 0.2,
  stalemateWarn: 12, stalemateAdvance: 18, stalemateZeus: 30, maxBattle: 360,
  hashCell: 3,
  navRefresh: 8,                             // ticks between flow field recomputes (~3.75 Hz)
  retargetEvery: 8,                          // ticks between target scans per unit (staggered)
  deathLinger: 1.6,                          // seconds a corpse stays in `dying` for its clip
};
