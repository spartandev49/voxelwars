// G3 (docs/eras/spec/VF.md 3.6.2, VF-T04 part 1): the id ledger of the shipped Ancient content. Rule zero of AR 3.3.1: Ancient ids never change.
// tests/fixtures/shipped_ids.json (recorded from the baseline) lists the ids by kind plus sha256(JSON.stringify(def)) of each of the 43 unit defs;
// tests/golden/g3_defs.json keeps each def's key order and JSON text so a red digest prints the field that moved.
// New eras ADD ids, so presence and order are checked as "every ledger id is live, and the live ids that are in the ledger keep the ledger order";
// the def digests, key order and counts of the ledger are exact.
//   labels: recorded_from_baseline, counts_literal, ids_present, ids_order, ids_owner, owner_selftest, def_digests, def_keys, tombstones
import { criterion } from '../lib/criteria.mjs';
import { ROOT, eraDirs } from '../../tools/lib/paths.mjs';
import { openTree } from '../../tools/golden/tree.mjs';
import { collectG3, ownerProblems, ancientSubsequence, G3_KINDS, G3_SORTED } from '../../tools/golden/g3_collect.mjs';
import { OWNER_KINDS } from '../../tools/golden/tree.mjs';
import { deepDiff } from '../../tools/golden/common.mjs';
import { loadGolden, red, finish, listFirst } from './_golden.mjs';

const c = criterion('VF-G3', { er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-G3.mjs', engine: 'node',
  text: 'Shipped Ancient id ledger by kind (43 units ... 374 sfx) present with owner ancient and in order; the 43 unit def JSON digests and key orders are unchanged' });

// the literal numbers of AR 3.3.1 / VF 3.6.2 (a tampered fixture cannot move them silently)
const EXPECTED = { units: 43, factions: 7, arenas: 16, recipes: 16, props: 41, propCategories: 4, parts: 254, missions: 9, puzzles: 6, achievements: 24, mutators: 9, abilities: 27,
  projectileKinds: 10, godPowers: 6, rigs: 8, music: 8, sfx: 374, unlockKeys: 3 };

const L1 = loadGolden('tests/fixtures/shipped_ids.json', { kind: 'g3_ids', engine: 'node' });
const L2 = loadGolden('tests/golden/g3_defs.json', { kind: 'g3_defs', engine: 'node' });
red(c, 'recorded_from_baseline', L1.problems.length + L2.problems.length === 0, [...L1.problems, ...L2.problems].join('; '));
if (!L1.rec || !L2.rec) { finish(c); process.exit(1); }
const led = L1.rec.data, defsRec = L2.rec.data.defs;
const exBad = Object.keys(EXPECTED).filter((k) => led.counts[k] !== EXPECTED[k] || (led.ids[k] || []).length !== EXPECTED[k]);
red(c, 'counts_literal', exBad.length === 0 && G3_KINDS.every((k) => Array.isArray(led.ids[k])), 'ledger counts differ from the spec numbers: ' + exBad.map((k) => `${k} ${led.counts[k]} != ${EXPECTED[k]}`).join(', '));

const { data: live, companions } = await collectG3(ROOT);
const missing = [], moved = [];
for (const kind of G3_KINDS) {
  const have = new Set(live.ids[kind]);
  const gone = led.ids[kind].filter((id) => !have.has(id));
  if (gone.length) missing.push(`${kind}: ${listFirst(gone, 4)}`);
  else if (!G3_SORTED.includes(kind) && ancientSubsequence(live.ids[kind], led.ids[kind]).join('\n') !== led.ids[kind].join('\n')) moved.push(kind);
}
red(c, 'ids_present', missing.length === 0, 'shipped ids no longer live (Ancient ids never change; a removal needs a tombstone): ' + missing.join(' | '));
red(c, 'ids_order', moved.length === 0, 'the order of these Ancient lists changed: ' + moved.join(', '));

// owner: with a registry every ledger id must be owned by ancient; without one the tree must still be single-era
const ownerOf = await (await openTree(ROOT, { regime: null })).ownerOf();
if (ownerOf) {
  const bad = ownerProblems(led.ids, ownerOf, Object.keys(OWNER_KINDS));
  red(c, 'ids_owner', bad.length === 0, 'registry.owner disagrees: ' + listFirst(bad));
} else {
  const eras = eraDirs(ROOT);
  red(c, 'ids_owner', eras.length === 1 && eras[0] === 'ancient', `no registry yet, so the tree must be single-era; found era directories ${eras.join(',')}`);
}
// the owner check itself: right owner passes, wrong owner and a throwing lookup are reported
{
  const ids = { units: ['hoplite', 'spartan'], props: ['rock_big'] };
  const ok = ownerProblems(ids, () => 'ancient', ['units', 'props']);
  const wrong = ownerProblems(ids, (k, id) => (id === 'spartan' ? 'medieval' : 'ancient'), ['units', 'props']);
  const thrower = ownerProblems(ids, () => { throw new Error('unknown kind'); }, ['units']);
  red(c, 'owner_selftest', ok.length === 0 && wrong.length === 1 && /spartan owned by medieval/.test(wrong[0]) && thrower.length === 2 && /threw/.test(thrower[0]), JSON.stringify({ ok, wrong, thrower }));
}

// defs: digest per def, then (for the red ones) the field-level diff from the recorded JSON text
const digestBad = Object.keys(led.defs).filter((id) => live.defs[id] !== led.defs[id]);
const detail = digestBad.slice(0, 3).map((id) => {
  const liveRow = companions.g3_defs.defs[id], rec = defsRec[id];
  if (!liveRow) return `${id}: def no longer built`;
  const dd = rec ? deepDiff(JSON.parse(rec.json), JSON.parse(liveRow.json), 3) : [];
  return `${id}: ${dd.map((d) => `${d.path} ${d.a} -> ${d.b}`).join('; ') || 'JSON text differs'}`;
});
red(c, 'def_digests', digestBad.length === 0 && Object.keys(led.defs).length === 43 && Object.keys(defsRec).length === 43 && Object.keys(led.defs).every((id) => defsRec[id] && defsRec[id].sha256 === led.defs[id]),
  `${digestBad.length} of 43 def JSON digests differ (${listFirst(digestBad)}): ${detail.join(' | ')}`);
// keys: the first N keys (the recorded top-level keys) keep their order; appended keys must be undefined (JSON drops them, the shape is the only change)
const keyBad = [];
for (const id of Object.keys(defsRec)) {
  const liveRow = companions.g3_defs.defs[id];
  if (!liveRow) { keyBad.push(id); continue; }
  const want = defsRec[id].keys, have = liveRow.keys;
  if (want.some((k, i) => have[i] !== k)) keyBad.push(`${id} (key order)`);
}
red(c, 'def_keys', keyBad.length === 0, 'top-level key order of these defs changed (hidden-class discipline of sim/defs.js): ' + listFirst(keyBad));
// tombstones: every recorded kind still exists and every recorded tombstone is still there
const tb = [];
for (const kind of Object.keys(led.tombstones)) {
  if (!(kind in live.tombstones)) { tb.push(`kind ${kind} gone`); continue; }
  for (const id of led.tombstones[kind]) if (!live.tombstones[kind].includes(id)) tb.push(`${kind}:${id} tombstone gone`);
}
red(c, 'tombstones', tb.length === 0, tb.join(', '));
finish(c);
