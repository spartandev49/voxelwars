// G2 (docs/eras/spec/VF.md 3.6.2; WC01 of spec/W): the arena generator golden, Node.
// generateArena(recipe, size, seed) for the 16 Ancient recipes x {small, medium, large} x seeds {1, 7} (96 cases) and the 16 shipped preset defaults, each
// as five FNV-1a-32 hashes (full arena JSON, terrain, materials, props, meta) recorded from the baseline worktree (tests/world/gen_golden.json).
// The test replays EXACTLY the recorded inputs, so new recipes, new presets and new eras cannot move it; only a change of what the Ancient generator
// produces can. Registered as VF-G2 (WORLD's WC01 may wrap this file).
//   labels: recorded_from_baseline, record_shape, recipes_list, presets_defaults, cases_equal, presets_equal
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { openTree } from '../../tools/golden/tree.mjs';
import { g2Replay, g2Compare, G2_PARTS } from '../../tools/golden/g2_core.mjs';
import { loadGolden, red, finish, listFirst } from './_golden.mjs';

const c = criterion('VF-G2', { er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-G2.mjs', engine: 'node',
  text: 'Ancient arena generator output: 96 recipe x size x seed cases + 16 preset defaults, five FNV hashes each, equal to the baseline record' });

const { rec, problems } = loadGolden('tests/world/gen_golden.json', { kind: 'g2_arena_hashes', engine: 'node' });
red(c, 'recorded_from_baseline', problems.length === 0, problems.join('; '));
if (!rec) { finish(c); process.exit(1); }
const d = rec.data;
red(c, 'record_shape', d.recipes.length === 16 && d.sizes.join() === 'small,medium,large' && d.seeds.join() === '1,7' && Object.keys(d.cases).length === 96 && d.presets.length === 16
  && d.parts.join() === G2_PARTS.join() && Object.values(d.cases).every((x) => x.length === 5 && x.every((h) => /^[0-9a-f]{8}$/.test(h))), 'the record must hold 16 recipes x 3 sizes x 2 seeds = 96 cases and 16 presets of five 8-digit hashes');

const T = await openTree(ROOT, { regime: null });
const [G, A] = await Promise.all([T.src('gen'), T.src('arenas')]);
// the recorded Ancient recipes are still the first 16 of the live list, in order (RECIPES.slice(0,16) equals the v8 list, WC01)
red(c, 'recipes_list', d.recipes.every((r, i) => G.RECIPES[i] === r), `live RECIPES starts ${G.RECIPES.slice(0, 16).join(',')}; recorded ${d.recipes.join(',')}`);
// the preset defaults (recipe, size, seed) of the shipped arenas are unchanged
const livePre = new Map(A.ARENAS.map((p) => [p.id, p]));
const preBad = d.presets.filter((p) => { const l = livePre.get(p.id); return !l || l.recipe !== p.recipe || l.size !== p.size || l.seed !== p.seed; }).map((p) => p.id);
red(c, 'presets_defaults', preBad.length === 0, 'preset default (recipe, size, seed) changed or preset missing: ' + listFirst(preBad));

const cmp = g2Compare(d, g2Replay(G.generateArena, d));
const fmt = (x) => `${x.key} [${x.parts.join('+')}]`;
red(c, 'cases_equal', cmp.cases.length === 0 && cmp.missing.length === 0, `${cmp.cases.length} of 96 cases differ (parts that moved in brackets): ${listFirst(cmp.cases.map(fmt))}${cmp.missing.length ? '; missing ' + listFirst(cmp.missing) : ''}`);
red(c, 'presets_equal', cmp.presets.length === 0, `${cmp.presets.length} of 16 preset defaults differ: ${listFirst(cmp.presets.map(fmt))}`);
finish(c);
