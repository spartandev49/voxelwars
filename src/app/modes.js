// modes.js: how a setup of kind campaign / puzzle / survival / daily becomes a World (docs/requests/campaign_integration.md sections 1, 5, 6, 7).
// Pure helpers over ctx.content: Game.begin calls resolveMode + applyModeRules before it builds the World, then campaignApi.setup on the fresh World.
//   resolveMode(content, setup)  -> { kind, m, puzzle, locked, survival }   m = the mission-shaped def (a puzzle through puzzleApi.asMission); locked = the player never places team B
//   applyModeRules(content, setup, mode)   mission rules / survival waves written onto setup.rules (UI choices such as gore and corpses stay)
//   dailySeed(rules)             the numeric seed of the daily's date key (the enemy of the day is the same call everywhere)
import { survivalRules } from '../content/era_ancient/survival.js';

const KEEP = ['gore', 'corpses', 'speed', 'daily', 'survival', 'par'];

export function resolveMode(content, setup) {
  const kind = (setup && setup.kind) || 'quick';
  const out = { kind, m: null, puzzle: null, locked: false, survival: false };
  if ((kind === 'campaign' || kind === 'puzzle') && setup.mission) {
    const capi = content.campaignApi, papi = content.puzzleApi;
    if (kind === 'puzzle') { const p = papi && papi.puzzleById(setup.puzzle || setup.mission); if (p) { out.puzzle = p; out.m = papi.asMission(p); } }
    else if (capi) out.m = capi.missionById(setup.mission);
    if (out.m && capi) out.locked = true; else out.m = out.puzzle = null;
    if (!out.m) console.warn('modes: unknown ' + kind + ' ' + setup.mission + ': playing it as a plain battle');
  } else if (kind === 'daily') out.locked = true;
  else if (kind === 'survival') { out.survival = true; out.locked = true; }
  return out;
}

export function applyModeRules(content, setup, mode) {
  const r = setup.rules || (setup.rules = {});
  if (mode.m) {
    const patch = content.campaignApi.rules(mode.m), keep = {};
    for (const k of KEEP) if (r[k] !== undefined) keep[k] = r[k];
    Object.assign(r, patch, keep);
    r.mutators = [];
  } else if (mode.survival) {
    const B = setup.armies && setup.armies.B;
    Object.assign(r, survivalRules(r, { faction: (B && B.faction) || 'mixed', autoAdvance: false }));
  }
  return r;
}

export function dailySeed(rules) {
  const n = Number(String((rules && rules.daily) || '').replace(/-/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 1;
}
