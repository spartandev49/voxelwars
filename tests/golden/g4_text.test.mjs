// G4 (docs/eras/spec/VF.md 3.6.2, VF-T04 part 2): the shipped Ancient text. tests/golden/g4_text.json (recorded from the baseline) holds, per text module, the
// sha256 of the canonical JSON of its data exports, a hash per export and a hash per key (object key / array index / announcer template id).
// A comedy edit of an Ancient line is a re-record with two signers (docs/eras/golden_log.md), never a silent change.
//   labels: recorded_from_baseline, module_set, module_hash, export_hashes, key_hashes, functions, announcer_order
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { collectG4, TEXT_TEST_MODULES } from '../../tools/golden/g4_collect.mjs';
import { mapDiff } from '../../tools/golden/common.mjs';
import { loadGolden, red, finish, listFirst } from './_golden.mjs';

const c = criterion('VF-G4', { er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-G4.mjs', engine: 'node',
  text: 'Shipped Ancient text (13 humor modules, SIM_BARKS, UI strings, lessons, wave names, custom text, puzzle text, 486 announcer templates) hashes equal the baseline' });

const { rec, problems } = loadGolden('tests/golden/g4_text.json', { kind: 'g4_text', engine: 'node' });
red(c, 'recorded_from_baseline', problems.length === 0, problems.join('; '));
if (!rec) { finish(c); process.exit(1); }
const want = rec.data;
const { data: live } = await collectG4(ROOT);

red(c, 'module_set', TEXT_TEST_MODULES.every((m) => want.modules[m]) && want.announcerOrder.count === 486 && want.moduleIds.length === Object.keys(want.modules).length
  && want.moduleIds.join() === live.moduleIds.join(), `recorded modules [${want.moduleIds.join(',')}] vs live [${live.moduleIds.join(',')}]; the 13 modules of tests/humor/text.test.mjs and 486 templates must be in the record`);

const modBad = Object.keys(want.modules).filter((m) => !live.modules[m] || live.modules[m].sha256 !== want.modules[m].sha256);
const modMsg = modBad.map((m) => {
  const w = want.modules[m], l = live.modules[m];
  if (!l) return `${m}: module gone`;
  const exp = mapDiff(w.exports, l.exports);
  const keyDiffs = [];
  for (const e of exp.changed) { const kd = mapDiff(w.keys[e] || {}, l.keys[e] || {}); keyDiffs.push(`${e}[${listFirst([...kd.changed, ...kd.missing.map((k) => '-' + k), ...kd.extra.map((k) => '+' + k)], 3)}]`); }
  return `${m}: ${exp.changed.length ? 'changed ' + keyDiffs.join(' ') : ''}${exp.missing.length ? ' removed exports ' + exp.missing.join(',') : ''}${exp.extra.length ? ' gained exports ' + exp.extra.join(',') : ''}`.trim();
});
red(c, 'module_hash', modBad.length === 0, `${modBad.length} of ${Object.keys(want.modules).length} text modules differ from the baseline: ${modMsg.join(' | ')}`);

// finer labels: every recorded export and every recorded key (a gained export or key is not a loss of Ancient text; module_hash reports it)
const expBad = [], keyBad = [];
for (const [m, w] of Object.entries(want.modules)) {
  const l = live.modules[m];
  for (const [e, h] of Object.entries(w.exports)) {
    if (!l || l.exports[e] !== h) expBad.push(`${m}.${e}`);
    for (const [k, kh] of Object.entries(w.keys[e])) if (!l || !l.keys[e] || l.keys[e][k] !== kh) keyBad.push(`${m}.${e}.${k || '(value)'}`);
  }
}
red(c, 'export_hashes', expBad.length === 0, `${expBad.length} exports changed: ${listFirst(expBad)}`);
red(c, 'key_hashes', keyBad.length === 0, `${keyBad.length} keys changed or removed: ${listFirst(keyBad, 10)}`);

const fnBad = [];
for (const [m, w] of Object.entries(want.modules)) {
  const l = live.modules[m]; if (!l) continue;
  for (const f of w.functions) if (!l.functions.includes(f)) fnBad.push(`${m}.${f}`);
  if (JSON.stringify(w.nestedFunctions) !== JSON.stringify(l.nestedFunctions)) fnBad.push(`${m} nested function fields`);
}
red(c, 'functions', fnBad.length === 0, 'text-module functions removed or nested function fields changed: ' + listFirst(fnBad));

const ao = want.announcerOrder, lo = live.announcerOrder;
const firstMoved = ao.ids.findIndex((id, i) => lo.ids[i] !== id);
red(c, 'announcer_order', ao.sha256 === lo.sha256 && ao.count === lo.count, `announcer templates: recorded ${ao.count}, live ${lo.count}${firstMoved >= 0 ? `; first difference at index ${firstMoved} (${ao.ids[firstMoved]} vs ${lo.ids[firstMoved]})` : ''}`);
finish(c);
