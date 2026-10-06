// The puzzle section of docs/campaign_report.md, built from the stored solutions (the replay itself is tests/campaign/puzzles.test.mjs).
import { PUZZLES } from '../../src/content/era_ancient/puzzles.js';
export function puzzleReport() {
  const L = ['## Puzzles (6)', '', '| id | arena | roster | budget / par | enemy | goal | solution (cost, units) | stars | time |', '|---|---|---|---|---|---|---|---|---|'];
  for (const p of PUZZLES) {
    const s = p.solution, by = {};
    for (const q of (s ? s.placements : [])) by[q.defId] = (by[q.defId] || 0) + 1;
    const en = {}; for (const q of p.enemy.placements) en[q.defId] = (en[q.defId] || 0) + 1;
    L.push(`| ${p.id} | ${p.arena.recipe} | ${p.player.roster.join(', ')} | ${p.budget} / ${p.par} | ${Object.keys(en).map((k) => en[k] + ' ' + k).join(', ')} | ${p.goalText} | ${s ? s.cost + ' dr: ' + Object.keys(by).map((k) => by[k] + ' ' + k).join(', ') : 'none yet'} | ${s ? s.stars : '-'} | ${s ? s.t + ' s' : '-'} |`);
  }
  return L.join('\n');
}
