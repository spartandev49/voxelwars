// GATE-T07: size budget rules and byte-report families (tools/lib/size_budget.mjs, tools/lib/families.mjs): NC-VF-06 / NC-VF-07 logic.
import { criterion } from '../lib/criteria.mjs';
import { checkBudget, FRAGMENT_FAIL, FRAGMENT_WARN, FILES_FAIL, DELTA_WARN } from '../../tools/lib/size_budget.mjs';
import { familyOf } from '../../tools/lib/families.mjs';

const c = criterion('GATE-T07', { er: 'ER14', owner: 'TOOLS-GATE', tier: 'T-fast', negctl: 'tests/negctl/GATE-T07.mjs', text: 'fragment <= 5,000,000 B (warn 4,500,000), published set <= 500 files, advisory growth warning, family map' });
const rep = (o = {}) => ({ minified: true, fragmentBytes: 3106540, publishedFiles: 382, ...o });
const get = (b, label) => b.checks.find((x) => x.label === label);

c.check('constants', FRAGMENT_FAIL === 5000000 && FRAGMENT_WARN === 4500000 && FILES_FAIL === 500 && DELTA_WARN === 300000);
c.check('v8_is_green', checkBudget(rep(), null).status === 'PASS');
c.check('fragment_cap_boundary_ok', get(checkBudget(rep({ fragmentBytes: 5000000 }), null), 'fragment_cap').ok === true);
c.check('fragment_cap', (() => { const b = checkBudget(rep({ fragmentBytes: 5000001 }), null); return b.status === 'FAIL' && get(b, 'fragment_cap').ok === false; })(), '5,000,001 B must fail (NC-VF-06)');
c.check('fragment_warn_is_amber_not_red', (() => { const b = checkBudget(rep({ fragmentBytes: 4500001 }), null); return b.status === 'AMBER' && get(b, 'fragment_warn').ok === false && get(b, 'fragment_cap').ok === true; })());
c.check('files_cap_counts_the_page', checkBudget(rep({ publishedFiles: 499 }), null).status === 'PASS' && checkBudget(rep({ publishedFiles: 500 }), null).status === 'FAIL', '499 files + the page = 500 passes, 500 + the page = 501 fails (NC-VF-07)');
c.check('files_cap_applies_unminified_too', checkBudget(rep({ minified: false, publishedFiles: 500 }), null).status === 'FAIL');
c.check('unminified_fragment_not_capped', checkBudget(rep({ minified: false, fragmentBytes: 9000000 }), null).status === 'PASS', 'the cap is on the minified page that ships');
c.check('delta_warn', checkBudget(rep({ fragmentBytes: 3500000 }), { fragmentBytes: 3100000 }).status === 'AMBER' && checkBudget(rep({ fragmentBytes: 3350000 }), { fragmentBytes: 3100000 }).status === 'PASS');
c.check('shrinking_is_fine', checkBudget(rep({ fragmentBytes: 2000000 }), { fragmentBytes: 3100000 }).status === 'PASS');

// families (AR 3.11.2): the anchors that the byte report is compared against
const F = [
  ['src/ui/screens/battle.js', 'ui/screens'], ['src/ui/hud/hud.js', 'ui/hud'], ['src/ui/kit.js', 'ui/root'], ['src/ui/hud', 'ui/root'],
  ['src/editors/arena/tools.js', 'editors/arena'], ['src/editors/soldier/x.js', 'editors/soldier'], ['src/editors/painter/p.js', 'editors/painter'], ['src/editors/shared.js', 'editors/root'],
  ['src/content/era_ancient/humor/announcer.js', 'era_ancient/humor'], ['src/content/era_medieval/parts/helms.js', 'era_medieval/parts'], ['src/content/era_scifi/beasts/dragon.js', 'era_scifi/beasts'],
  ['src/content/era_ancient/props/models/index.js', 'era_ancient/props'], ['src/content/era_ancient/units/units_a.js', 'era_ancient/units'], ['src/content/era_ancient/stats.js', 'era_ancient/top'], ['src/content/era_modern/campaign.js', 'era_modern/top'],
  ['src/content/registry.js', 'content'], ['src/content/shared/factory.js', 'content'],
  ['src/sim/world.js', 'sim/root'], ['src/sim/abilities/heal.js', 'sim/abilities'], ['src/anim/clips/hum1_attack.js', 'anim/clips'], ['src/anim/animator.js', 'anim/root'],
  ['src/render/battleview.js', 'render'], ['src/audio/index.js', 'audio'], ['src/app/main.js', 'app'], ['src/save/docs.js', 'save'], ['src/world/gen.js', 'world'], ['src/core/rng.js', 'core'], ['src/voxel/mesher.js', 'voxel'],
  ['src/_generated/registry.ui.js', '_generated'], ['/tmp/x/out/_generated/registry.ui.js', '_generated'], ['node_modules/foo/index.js', 'node_modules'],
];
for (const [p, fam] of F) c.check('family:' + p, familyOf(p) === fam, `${p} -> ${familyOf(p)} (expected ${fam})`);
console.log(`GATE-T07 ok: ${c.assertions} assertions`);
