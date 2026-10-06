// Shared sim constants and enums.
export const DT = 1 / 30;
export const TEAM_A = 0, TEAM_B = 1, TEAM_N = 2;

// unit states
export const ST = { IDLE: 0, MOVE: 1, WINDUP: 2, RECOVER: 3, STAGGER: 4, STUN: 5, CAST: 6, ROUT: 7, SIT: 8, CHEER: 9, GETUP: 10, FLY: 11, COWER: 12, DOWN: 13 };

// status effect slots (float seconds remaining)
export const SE = {
  BURN: 0, SLOW: 1, STUN: 2, ROOT: 3, CONFUSE: 4, SLEEP: 5, STONE: 6, RAGE: 7, HASTE: 8, DMGUP: 9, CURSE: 10, SCARE: 11, TIPSY: 12, POISON: 13, DISARM: 14, TAUNT: 15,
  PANIC: 16, DOWNED: 17, WARHORN: 18, NOHEAL: 19,
};
export const N_SE = 20;
export const SE_NAMES = Object.keys(SE).map((k) => k.toLowerCase());

export const DAMAGE_TYPES = ['slash', 'pierce', 'blunt', 'fire', 'magic'];
export const AP = { slash: 0, pierce: 0.3, blunt: 0.2, fire: 1, magic: 1 };

// world gameplay tunables
export const G = {
  gravity: 22,
  groundFollow: 12,          // u/s unit vertical follow
  knockFriction: 6,
  critChance: 0.06, critMul: 2,
  kbScale: 0.06, kbMax: 48, staggerKb: 5,   // knockback: v0 = kb*dmg/mass*kbScale (u/s), clamp kbMax (8 u of travel); stagger when v0 > staggerKb
  backstabMul: 1.35, backstabArcCos: 0.5,    // attacker outside the target's 120deg front arc: dot(targetForward, toAttacker) < cos(60deg)
  chargeDmg: 1.0, chargeKb: 1.5,
  braceMul: 2.4, braceArcCos: 0.64,          // 50 degrees
  trampleDps: 18, trampleMassMax: 3, trampleMassMin: 8, trampleSpeed: 1.5,
  moraleAllyDeath: 2, moraleFlanked: 6, moraleLowHp: 0.3, moraleLowRate: 0.9, moraleOfficerRate: 1.2, moraleOfficerR: 10,
  routThreshold: 15, rallyThreshold: 40, rallyHold: 3,
  armyCollapseFrac: 0.2, armyCollapseRate: 10, armyCollapseMin: 6,
  stalemateWarn: 12, stalemateAdvance: 18, stalemateZeus: 30, stalemateQuit: 44, maxBattle: 360,
  hashCell: 3,
  navRefresh: 6,                             // ticks between flow field recomputes (teams alternate: each field refreshes every 12 ticks = 2.5 Hz)
  retargetNormal: 12, retargetEasy: 24, retargetHard: 6, diffDmg: [0.88, 1, 1.15], godMul: 1.6,   // ticks between target scans (reaction 0.4 / 0.8 / 0.2 s)
  deathLinger: 1.6,                          // seconds a corpse stays in `dying` for its clip
  slotsBase: 2, slotsPerRadius: 4, slotsLarge: 8,
  jogMul: 1.3,                               // formation march speed multiplier far from the enemy
  engageFar: 30, engageNear: 14,             // distances over which the jog fades out
};

export const DIFF = { easy: 0, normal: 1, hard: 2 };
