// G5 fixture (docs/eras/spec/VF.md 3.6.3; VF-T05): tests/save/fixtures/ancient_release_v8.mjs is a REAL v8 profile, made by driving the baseline build in Chromium
// (tools/golden/g5_make_fixture.mjs). This test checks the fixture against the BASELINE'S OWN code (imported by path): it is what it claims to be and it is a faithful
// picture of what v8 writes. The both-direction round trips against the build under test are tests/save/compat_both_ways.test.mjs (AR-T13).
//   labels: provenance, keys, profile_content, settings_moved, baseline_loads_clean, export_code, export_matches_storage, share_codes
// @nocache  (a golden imports the tree and the baseline through import(<expr>) on purpose: never served from the closure cache)
import fs from 'node:fs';
import path from 'node:path';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { BASELINE_SHA, BASELINE_TAG, BASELINE_WORKTREE, assertBaseline } from '../../tools/golden/baseline.mjs';
import { loadStack } from '../../tools/golden/save_stack.mjs';
import { canonicalJSON } from '../../tools/lib/records.mjs';
import FIX from './fixtures/ancient_release_v8.mjs';

const c = criterion('VF-G5', { er: ['ER16', 'ER1'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-G5.mjs', engine: 'node',
  text: 'The real v8 profile fixture (driven in Chromium) is what it claims: provenance, nine keys, content, loads clean in the baseline, its Export code and share codes decode' });
const soft = (label, ok, detail = '') => { const good = c.soft(label, !!ok); if (!good) console.error(`RED ${c.id}/${label}${detail ? ': ' + String(detail).split('\n').slice(0, 8).join('\n    ') : ''}`); return good; };
assertBaseline(BASELINE_WORKTREE);
const B = await loadStack(BASELINE_WORKTREE);
const LS = FIX.LOCAL_STORAGE, parsed = Object.fromEntries(Object.entries(LS).map(([k, raw]) => [k.slice(3), JSON.parse(raw)]));
const NINE = ['settings', 'progress', 'survival', 'daily', 'seen', 'stats', 'arenas', 'soldiers', 'armies'];

// ---- provenance: what was driven, and that the page is the shipped one
{
  const P = FIX.PROVENANCE, pageSha = fs.readFileSync(path.join(ROOT, 'release/v8/PAGE.sha256'), 'utf8').trim().split(/\s+/)[0];
  const keysLen = (P.keys || []).map(([k, n]) => `${k}:${n}`).join();
  soft('provenance', P.sha === BASELINE_SHA && P.tag === BASELINE_TAG && P.page && P.page.sha256 === pageSha && /^141\./.test(P.chromium) && P.producer === 'tools/golden/g5_make_fixture.mjs'
    && canonicalJSON(P.steps) === canonicalJSON(['settings', 'campaign', 'puzzle', 'survival', 'daily', 'soldiers', 'arenas', 'armies', 'export']) && keysLen === Object.keys(LS).sort().map((k) => `${k}:${LS[k].length}`).join(),
    `provenance: ${JSON.stringify({ sha: P.sha, tag: P.tag, page: P.page && P.page.sha256, chromium: P.chromium, steps: P.steps })}`);
}
// ---- the nine content keys, each a {v, data} envelope of the version the baseline writes; nothing else (no drafts, no backups, no beacon state)
{
  const names = Object.keys(parsed).sort(), want = [...NINE].sort();
  const ver = B.constants().CURRENT;
  const vOk = NINE.every((k) => parsed[k] && Number.isInteger(parsed[k].v) && 'data' in parsed[k] && (k in ver ? parsed[k].v === ver[k] : parsed[k].v === 1));
  soft('keys', names.join() === want.join() && vOk, `keys ${names.join()} (want ${want.join()}); versions ${NINE.map((k) => k + ':' + (parsed[k] && parsed[k].v)).join(' ')}`);
}
// ---- the profile is rich: every part of AR 3.5.4's description is present
{
  const E = FIX.EXPECT, p = parsed.progress.data, s = parsed.survival.data, dd = parsed.daily.data, st = parsed.stats.data;
  const soldiers = parsed.soldiers.data, arenas = parsed.arenas.data, armies = parsed.armies.data;
  const ok = soldiers.length === 3 && new Set(soldiers.map((x) => x.id)).size === 3 && arenas.length === 3 && new Set(arenas.map((x) => x.id)).size === 3 && armies.length === 2
    && p.stars.marathon_sort_of >= 1 && p.stars.thermopylae_snack >= 1 && p.puzzles && p.puzzles.spear_wall && p.puzzles.spear_wall.stars >= 1
    && s.bestWave >= 2 && s.board.length >= 1 && dd.history.length === 3 && dd.streak >= 1 && typeof dd.last === 'string' && dd.last.length === 10
    && st.battles >= 6 && Object.keys(parsed.seen.data).length >= 1 && E && E.soldiers.length === 3 && E.arenas.length === 3 && E.armies.length === 2 && Array.isArray(p.unlocks || p.parts || p.unlockedMutators || p.titles);
  soft('profile_content', ok, `soldiers ${soldiers.length} arenas ${arenas.length} armies ${armies.length} stars ${JSON.stringify(p.stars)} puzzles ${JSON.stringify(p.puzzles)} survival ${JSON.stringify({ bestWave: s.bestWave, board: s.board.length })} daily ${JSON.stringify({ streak: dd.streak, history: dd.history.length })} stats.battles ${st.battles}`);
}
// ---- every setting the Settings screen offers was moved off its default (the fixture exercises the whole settings document)
{
  const def = B.store.DEFAULT_SETTINGS, cur = parsed.settings.data, same = [];
  for (const k of Object.keys(def)) {
    if (['keys', 'seenHints', 'beacon'].includes(k)) continue;
    if (k === 'vol') { for (const b of Object.keys(def.vol)) if (cur.vol[b] === def.vol[b]) same.push('vol.' + b); } else if (canonicalJSON(cur[k]) === canonicalJSON(def[k])) same.push(k);
  }
  soft('settings_moved', same.length === 0 && cur.gore === 'wine' && cur.keys && cur.keys.pause === 'KeyJ', `settings still at their default: ${same.join(',')}; gore ${cur.gore}; keys ${JSON.stringify(cur.keys)}`);
}
// ---- the baseline loads it without a migration, a backup or an error, and its live objects agree with the stored bytes
const dev = B.device(LS);
{
  const infos = ['progress', 'survival', 'daily', 'seen'].map((k) => [k, dev.docs[k].status, dev.docs[k].info.error, dev.docs[k].info.migrated.length, dev.docs[k].info.backup]);
  const clean = infos.every(([, st, err, mig, bak]) => st === 'ok' && !err && mig === 0 && !bak);
  const eq = ['progress', 'survival', 'daily', 'seen'].every((k) => canonicalJSON(dev.docs[k].all()) === canonicalJSON(parsed[k].data));
  soft('baseline_loads_clean', clean && eq && canonicalJSON(dev.settings.all()) === canonicalJSON(parsed.settings.data) && dev.collections.soldiers.list().length === 3 && dev.collections.arenas.list().length === 3 && dev.collections.armies.list().length === 2 && !Object.keys(dev.dump()).some((k) => k.startsWith('bak.')),
    `docs ${JSON.stringify(infos)}; live documents equal the stored ones ${eq}`);
}
// ---- the Export code is what the real button produced: framing, crc, and payload = the nine keys of storage; the baseline re-exports the same data
let payload = null;
try { payload = (await B.share.decodeShare(FIX.EXPORT_CODE, { types: ['save'], maxLen: 8000000, maxInflate: 30 * 1024 * 1024 })).json; } catch (e) { soft('export_code', false, 'the Export code does not decode in the baseline: ' + e.message); }
if (payload) {
  const again = await B.share.decodeShare(await dev.T.exportAll(), { types: ['save'], maxLen: 8000000, maxInflate: 30 * 1024 * 1024 });
  soft('export_code', /^VW1\.save\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/.test(FIX.EXPORT_CODE) && payload.f === 1 && payload.app === 'voxelwars' && Object.keys(payload.keys).sort().join() === [...NINE].sort().join() && canonicalJSON(again.json.keys) === canonicalJSON(payload.keys),
    `payload keys ${Object.keys(payload.keys)}; the baseline's re-export of the loaded profile equals the Export code: ${canonicalJSON(again.json.keys) === canonicalJSON(payload.keys)}`);
  soft('export_matches_storage', NINE.every((k) => canonicalJSON(payload.keys[k]) === canonicalJSON(parsed[k])), 'the Export code and the stored keys differ for: ' + NINE.filter((k) => canonicalJSON(payload.keys[k]) !== canonicalJSON(parsed[k])).join(','));
}
// ---- the three share codes of the real dialogs import in the baseline and describe the saved items
{
  const ctx = { defs: B.defs }, got = {};
  for (const type of ['soldier', 'arena', 'army']) { try { got[type] = await B.share.importShare(FIX.SHARE_CODES[type], type, ctx); } catch (e) { got[type] = { err: e.message }; } }
  const s0 = parsed.soldiers.data.find((x) => x.name === 'Sir Phalanx the Punctual'), a0 = parsed.arenas.data.find((x) => x.name === 'Hill Of Beans'), r0 = parsed.armies.data.find((x) => x.name === 'Bean Counters');
  const sOk = got.soldier.value && s0 && got.soldier.value.name === s0.name && canonicalJSON(got.soldier.value.stats) === canonicalJSON(s0.stats);
  const aOk = got.arena.arena && a0 && got.arena.arena.toJSON().h.length === (a0.data || a0.arena || a0).h.length;
  const rOk = got.army.value && r0 && (got.army.value.records || []).length === (r0.records || (r0.army && r0.army.records) || []).length;
  soft('share_codes', sOk && aOk && rOk, `share codes: soldier ${sOk} ${got.soldier.err || ''} arena ${aOk} ${got.arena.err || ''} army ${rOk} ${got.army.err || ''}`);
}
if (c.failures.length) { console.error(`RED ${c.id}: ${c.failures.join(', ')}`); process.exitCode = 1; } else console.log(`ok  ${c.id}: ${c.assertions} assertions`);
c.done();
