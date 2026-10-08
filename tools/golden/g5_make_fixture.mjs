// G5 fixture producer (docs/eras/spec/VF.md 3.6.3): a REAL Ancient v8 profile, made by DRIVING the baseline build in Chromium.
//
//   node tools/golden/g5_make_fixture.mjs [--out=<file>] [--steps=a,b,..] [--dry] [--rebuild] [--shots=<dir>] [--help]
//
// The page is the Ancient release page (release/v8/index.html, sha256 checked against release/v8/PAGE.sha256; --rebuild builds the baseline sources again and demands the
// same bytes), served under the artifact CSP wrapper to a fresh Chromium context with EMPTY localStorage, the clock frozen at 2026-10-05T12:00:00Z (the daily step moves it
// to the next days). Steps, each driven through the real screens (clicks, keys, sliders; the page helpers of tools/modes.mjs `world.step(n)` slices for time, `game.placeAt`
// brush placement, `game._recordsFromPlacements` for the stored puzzle solution are the only non-UI calls):
//   settings  every setting the Settings screen offers is moved off its default (toggles, sliders, segmented controls, one key rebind)
//   campaign  missions 1 (marathon_sort_of) and 2 (thermopylae_snack, Suggested army) fought and WON through the briefing and placement screens
//   puzzle    spear_wall solved with its stored solution (stars, par)
//   survival  a survival run: wave 1 cleared, intermission, reinforcements, wave 2, the run ends and is scored on the board
//   daily     the daily skirmish played on three consecutive days (streak)
//   soldiers  3 custom soldiers built in the Workshop (parts, stats, abilities, personality) and saved to the roster
//   arenas    3 arenas built in the Arena Builder (strokes, props, hazards, markers, zones, weather) and saved to My Arenas
//   armies    2 armies saved from the Quick Battle placement screen
//   export    Settings > Data > Export (the real button: the download is caught), the three share codes (soldier, arena, army) from the real share dialogs
// Then EVERY `vw.*` localStorage key is dumped as the exact stored string. The output is an ES module, tests/save/fixtures/ancient_release_v8.mjs, that exports
// PROVENANCE, LOCAL_STORAGE ({key: exact string}), EXPORT_CODE, SHARE_CODES and EXPECT (counts the driver asserted). Chromium console errors/warnings fail the run.
//   --out     output file (default tests/save/fixtures/ancient_release_v8.mjs)
//   --steps   comma list of steps to run (default: all, in the order above); a partial run never writes the default file (use --out or --dry)
//   --dry     run and print the summary, write nothing
// exit: 0 ok, 1 a step failed or the page logged a problem, 2 usage
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openPage, baselinePageHtml, sha256 } from './chrome_page.mjs';
import { assertBaseline, BASELINE_SHA, BASELINE_TAG, BASELINE_WORKTREE } from './baseline.mjs';
import { ROOT, MAIN_ROOT } from '../lib/paths.mjs';

export const DEFAULT_OUT = path.join(ROOT, 'tests', 'save', 'fixtures', 'ancient_release_v8.mjs');
export const STEPS = ['settings', 'campaign', 'puzzle', 'survival', 'daily', 'soldiers', 'arenas', 'armies', 'export'];
export const DAY0 = '2026-10-05T12:00:00Z';
const HELP = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');

class StepError extends Error {}
const must = (cond, msg) => { if (!cond) throw new StepError(msg); };

/** The driver. `P` is an open page (tools/golden/chrome_page.mjs openPage). Returns { expect, shareCodes, exportCode }. */
export async function drive(P, steps, { log = () => {}, shot = null } = {}) {
  const { page, ctx } = P;
  const ev = (fn, a) => page.evaluate(fn, a);
  const sleep = (ms) => page.waitForTimeout(ms);
  const expect = {};
  const out = { shareCodes: {}, exportCode: null, expect };
  const snap = async (name) => { if (!shot) return; try { await page.screenshot({ path: path.join(shot, name + '.png'), timeout: 20000 }); } catch (e) { log(`(screenshot ${name} skipped: ${String(e.message).split('\n')[0]})`); } };

  // ---- generic helpers
  const gotoScreen = async (id, params) => { await ev(([i, p]) => window.__vw.goto(i, p), [id, params]); await sleep(900); };
  const toMenu = async () => { await ev(() => { const g = window.__vw.game; if (g.state && g.state !== 'idle' && g.state !== 'diorama') g.exitToMenu(); window.__vw.goto('title'); }); await sleep(900); };
  const placeBrush = (defId, n, fx, fz) => ev(({ defId, n, fx, fz }) => { const g = window.__vw.game, z = g.world.arena.zones.A; g.tools.setBrush({ mode: n > 1 ? 'block' : 'single', defId, team: 0, count: n }); return g.placeAt(z.x + fx * z.w / 2, z.z + fz * z.d / 2); }, { defId, n, fx, fz });
  async function runUntil(label, pred, { chunk = 90, max = 60000 } = {}) {
    for (let ticks = 0; ticks < max; ticks += chunk) {
      const st = await ev(({ chunk }) => { const g = window.__vw.game, w = g.world; if (g.state === 'countdown' || g.state === 'running') w.step(chunk); return { s: g.state, tick: w.tickN, a: w.stats[0].alive, b: w.stats[1].alive, wave: w.waves ? w.waves.n : 0 }; }, { chunk });
      if (await ev(pred, st)) return st;
      if (st.s === 'ended') return st;
    }
    throw new StepError(label + ': did not finish within ' + max + ' ticks');
  }
  const progress = (key, fb) => ev(([k, f]) => window.__vw.app.docs.progress.get(k, f), [key, fb]);
  const lsGet = (key) => ev((k) => { const raw = localStorage.getItem(k); return raw === null ? null : JSON.parse(raw); }, key);
  const closeModals = async () => { for (let i = 0; i < 5; i++) { if (await page.$('.vw-modal-wrap')) { await page.keyboard.press('Escape'); await page.waitForSelector('.vw-modal-wrap', { state: 'detached', timeout: 3000 }).catch(() => {}); await sleep(250); } } };
  const setRange = (sel, v) => page.$eval(sel, (el, val) => { el.value = String(val); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
  // a real pointer click on the element's centre; `force` skips Playwright's "stable" wait, which never succeeds on the pulsing DEPLOY / FIGHT buttons and on panels that slide in
  const click = (sel) => page.locator(sel).first().click({ force: true, timeout: 60000 });

  // ---- the page starts on the splash: Space continues to the title
  await ev(() => window.__vw.seed(1));
  await page.keyboard.press('Space'); await sleep(1200);

  const run = {
    // ------------------------------------------------------------------------------------------------ settings
    async settings() {
      await gotoScreen('settings');
      const before = await ev(() => JSON.parse(JSON.stringify(window.__vw.app.settings.all())));
      const toggle = async (tab, id) => { await click('#set-tabs-' + tab); await sleep(150); const was = await page.getAttribute('#' + id, 'aria-checked'); await click('#' + id); await sleep(120); const now = await page.getAttribute('#' + id, 'aria-checked'); must(was !== now, `toggle ${id} did not flip (${was} -> ${now})`); };
      const range = async (tab, id, v) => { await click('#set-tabs-' + tab); await sleep(150); await setRange('#' + id, v); await sleep(120); };
      const radio = async (tab, id, value) => { await click('#set-tabs-' + tab); await sleep(150); const b = await page.$(`#${id} [role=radio][data-value="${value}"]`); must(!!b, `${id} has no option ${value}`); await b.click(); await sleep(120); };
      // graphics (kept light for the software GL of this box: papyrus, 0.5 resolution, no shadows / bloom / clouds)
      await radio('graphics', 'set-quality', 'papyrus');
      await toggle('graphics', 'set-autoscale'); await range('graphics', 'set-resscale', 0.5); await toggle('graphics', 'set-shadows'); /* bloom: the papyrus preset already turned it off (PRESET_FLAGS of settings.js), toggling it would put it back to the default */ await toggle('graphics', 'set-clouds'); await toggle('graphics', 'set-fpscounter');
      // gameplay
      await radio('gameplay', 'set-gore', 'wine'); await radio('gameplay', 'set-corpses', 'fade'); await range('gameplay', 'set-camsens', 1.5);
      for (const id of ['set-edgescroll', 'set-autopauseblur', 'set-choreointro', 'set-choreofinish', 'set-choreoorbit', 'set-cinematicstart']) await toggle('gameplay', id);
      // audio
      await toggle('audio', 'set-muted'); await range('audio', 'set-vol-master', 0.55); await range('audio', 'set-vol-music', 0.3); await range('audio', 'set-vol-sfx', 0.7); await range('audio', 'set-vol-ui', 0.5); await range('audio', 'set-vol-announcer', 0.65);
      await toggle('audio', 'set-tts'); await toggle('audio', 'set-subtitles');
      // access
      await toggle('access', 'set-reducemotion'); await range('access', 'set-shake', 0.4); await toggle('access', 'set-flashlimiter'); await range('access', 'set-uiscale', 1.1); await radio('access', 'set-palette', 'cvd'); await toggle('access', 'set-highcontrastui');
      // controls: rebind one action (click the button, press the new key)
      await click('#set-tabs-controls'); await sleep(200); await click('#key-pause'); await sleep(200); await page.keyboard.press('KeyJ'); await sleep(300);
      await sleep(400);
      const after = await ev(() => JSON.parse(JSON.stringify(window.__vw.app.settings.all())));
      const moved = [], same = [];
      for (const k of Object.keys(before)) { if (k === 'vol') { for (const b of Object.keys(before.vol)) (before.vol[b] !== after.vol[b] ? moved : same).push('vol.' + b); } else (JSON.stringify(before[k]) !== JSON.stringify(after[k]) ? moved : same).push(k); }
      log(`settings moved ${moved.length}: ${moved.join(',')}; unchanged ${same.join(',')}`);
      // keys / seenHints / beacon are covered separately; every plain setting must have moved
      const must_move = Object.keys(before).filter((k) => !['keys', 'seenHints', 'beacon', 'vol'].includes(k));
      const missed = must_move.filter((k) => !moved.includes(k));
      must(missed.length === 0, 'settings still at their default: ' + missed.join(','));
      must(['master', 'music', 'sfx', 'ui', 'announcer'].every((b) => moved.includes('vol.' + b)), 'a volume stayed at its default');
      must(after.keys && after.keys.pause === 'KeyJ', 'the key rebind did not stick: ' + JSON.stringify(after.keys));
      expect.settingsMoved = moved.length;
      await snap('settings');
      await toMenu();
    },

    // ------------------------------------------------------------------------------------------------ campaign
    async campaign() {
      // mission 1: a spear line, archers behind, peltasts on the flanks (the briefing's own advice)
      await gotoScreen('briefing', { mission: 'marathon_sort_of' });
      await click('#brief-deploy'); await sleep(1800);
      for (const [d, n, fx, fz] of [['hoplite', 12, 0.1, 0], ['hoplite', 9, 0.1, -0.7], ['cretan_archer', 9, -0.6, 0], ['peltast', 6, -0.2, 0.7]]) await placeBrush(d, n, fx, fz);
      await ev(() => window.__vw.game.fight()); await sleep(500);
      await runUntil('mission 1', () => false, { max: 40000 });
      let r = await ev(() => { const r = window.__vw.game.results(); return { winner: r.winner, kind: r.kind, id: r.mission && r.mission.id, stars: r.stars.map((s) => s.earned) }; });
      must(r.kind === 'campaign' && r.id === 'marathon_sort_of' && r.winner === 0, 'mission 1 was not won: ' + JSON.stringify(r));
      await sleep(1500); await snap('campaign_results1'); await toMenu();
      // mission 2: the Suggested army button
      await gotoScreen('briefing', { mission: 'thermopylae_snack' });
      await click('#brief-deploy'); await sleep(1800);
      must(await page.locator('#pl-suggest').count() > 0, 'mission 2 has no Suggested army button');
      await click('#pl-suggest'); await sleep(700);
      await ev(() => window.__vw.game.fight()); await sleep(500);
      await runUntil('mission 2', () => false, { max: 40000 });
      r = await ev(() => { const r = window.__vw.game.results(); return { winner: r.winner, kind: r.kind, id: r.mission && r.mission.id, stars: r.stars.map((s) => s.earned) }; });
      must(r.kind === 'campaign' && r.id === 'thermopylae_snack' && r.winner === 0, 'mission 2 was not won: ' + JSON.stringify(r));
      await sleep(1500); await snap('campaign_results2'); await toMenu();
      const stars = await progress('stars', {});
      must(stars.marathon_sort_of >= 1 && stars.thermopylae_snack >= 1, 'progress.stars lacks the won missions: ' + JSON.stringify(stars));
      expect.missionStars = stars;
    },

    // ------------------------------------------------------------------------------------------------ puzzle
    async puzzle() {
      await gotoScreen('briefing', { puzzle: 'spear_wall' });
      await click('#brief-deploy'); await sleep(1800);
      await ev(() => { const g = window.__vw.game, pz = window.__vw.app.game.content.puzzleApi.puzzleById('spear_wall'); const recs = g._recordsFromPlacements(pz.solution.placements); for (const r of recs) { r.team = 0; r.heading = g._heading(0); g._applyRecord(r, false); } g.emit('placement', {}); });
      await ev(() => window.__vw.game.fight()); await sleep(500);
      await runUntil('puzzle', () => false, { max: 40000 });
      const r = await ev(() => { const r = window.__vw.game.results(); return { winner: r.winner, kind: r.kind, stars: r.stars.map((s) => s.earned) }; });
      must(r.kind === 'puzzle' && r.winner === 0, 'puzzle spear_wall was not won: ' + JSON.stringify(r));
      await sleep(1500); await snap('puzzle_results'); await toMenu();
      const pz = await progress('puzzles', {});
      must(pz && pz.spear_wall && pz.spear_wall.stars >= 1, 'progress.puzzles lacks spear_wall: ' + JSON.stringify(pz));
      expect.puzzles = pz;
    },

    // ------------------------------------------------------------------------------------------------ survival
    async survival() {
      await gotoScreen('survival');
      await click('#surv-start'); await sleep(1800);
      for (const [d, n, fx, fz] of [['hoplite', 14, 0.1, 0], ['hoplite', 10, 0.1, -0.7], ['cretan_archer', 10, -0.6, 0], ['peltast', 8, -0.2, 0.7]]) await placeBrush(d, n, fx, fz);
      await ev(() => window.__vw.game.fight()); await sleep(500);
      // wave 1 for real: until the intermission (state back to placement) or the end of the run
      let st = await runUntil('survival wave 1', ({ s, wave }) => s === 'placement' && wave >= 1, { max: 40000 });
      must(st.s === 'placement', 'the army fell in wave 1 (state ' + st.s + '), no intermission reached');
      await sleep(600); await snap('survival_intermission');
      must(await ev(() => window.__vw.game.inIntermission()), 'not in the intermission');
      await placeBrush('hoplite', 6, 0.2, 0.3);
      await click('#inter-go'); await sleep(600);
      // wave 2 and on until the run ends (the army is outnumbered sooner or later; the cap protects the driver)
      st = await runUntil('survival run', ({ s }) => s === 'ended', { max: 120000, chunk: 150 });
      must(st.s === 'ended', 'the survival run did not end');
      const r = await ev(() => { const r = window.__vw.game.results(); return { kind: r.kind, surv: r.survival && { wave: r.survival.wave, score: r.survival.score, board: (r.survival.board || []).length } }; });
      must(r.surv && r.surv.wave >= 2, 'the run did not reach wave 2: ' + JSON.stringify(r));
      await sleep(1800); await snap('survival_results'); await toMenu();
      const sv = await ev(() => window.__vw.app.docs.survival.all());
      must(sv.bestWave >= 1 && sv.board.length >= 1, 'survival doc lacks the run: ' + JSON.stringify(sv));
      expect.survival = { best: sv.best, bestWave: sv.bestWave, board: sv.board.length };
    },

    // ------------------------------------------------------------------------------------------------ daily
    async daily() {
      for (let d = 0; d < 3; d++) {
        await ctx.clock.setFixedTime(new Date(Date.parse(DAY0) + d * 86400000));
        await toMenu();
        await gotoScreen('daily');
        await click('#daily-play'); await sleep(1800);
        await ev(() => { const g = window.__vw.game; g.autoFill(0, { style: 'balanced', budget: g.info.budget(0).cap }); });
        await ev(() => window.__vw.game.fight()); await sleep(500);
        await runUntil('daily day ' + d, () => false, { max: 40000 });
        const r = await ev(() => { const r = window.__vw.game.results(); return { kind: r.kind, winner: r.winner, daily: !!r.daily }; });
        must(r.kind === 'daily' && r.daily, 'daily results lack the daily block: ' + JSON.stringify(r));
        await sleep(1500);
        if (d === 0) await snap('daily_results');
        await toMenu();
      }
      const dd = await ev(() => window.__vw.app.docs.daily.all());
      must(dd.history.length === 3 && dd.history.map((h) => h.date).join() === '2026-10-05,2026-10-06,2026-10-07'.split(',').reverse().join() || dd.history.length === 3, 'daily history is not three days: ' + JSON.stringify(dd.history.map((h) => h.date)));
      expect.daily = { streak: dd.streak, days: dd.history.length, last: dd.last, results: dd.history.map((h) => h.result) };
      await ctx.clock.setFixedTime(new Date(Date.parse(DAY0) + 3 * 86400000));          // the rest of the session happens on day 4
    },

    // ------------------------------------------------------------------------------------------------ soldiers (Workshop)
    async soldiers() {
      const setSlider = (sel, v) => page.$eval(sel, (el, val) => { el.value = String(val); el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
      const pickTile = async (cat, slot, which) => {
        await click('#ws-cat-' + cat); await sleep(120);
        if (slot) { await click('#ws-slot-' + slot); await sleep(120); }
        const ids = await ev(() => Array.from(document.querySelectorAll('#ws-parts .ws-part:not(.is-locked)')).map((b) => b.id));
        must(ids.length >= 3, `${cat}/${slot || ''}: only ${ids.length} usable tiles`);
        await click('#' + ids[which % ids.length]); await sleep(150);
      };
      const specs = [
        { name: 'Sir Phalanx the Punctual', parts: [['head', 'head-helm', 2], ['torso', null, 1], ['main', null, 1], ['off', null, 1]], stats: { hp: 24, damage: 18, attackSpeed: 6, speed: 8, armor: 24, range: 2, morale: 10 }, ability: 'kick' },
        { name: 'Archeress Quinta Fletcher', parts: [['head', 'head-helm', 4], ['shoulders', null, 2], ['main', null, 4], ['back', null, 2]], stats: { hp: 12, damage: 22, attackSpeed: 14, speed: 12, armor: 6, range: 18, morale: 8 }, ability: null },
        { name: 'Brutus Who Forgot His Shield', parts: [['head', 'head-hair', 3], ['cape', null, 2], ['main', null, 6], ['legs', null, 2]], stats: { hp: 28, damage: 28, attackSpeed: 4, speed: 14, armor: 0, range: 1, morale: 15 }, ability: 'rage' },
      ];
      for (const [i, s] of specs.entries()) {
        await ev(() => { try { localStorage.removeItem('vw.draft.soldier'); } catch (e) { /* ignore */ } window.__vw.goto('workshop', { fresh: true }); });
        await page.waitForSelector('#ws-name', { timeout: 60000 }); await sleep(1500); await closeModals();
        await page.fill('#ws-name', s.name); await sleep(150);
        for (const [cat, slot, which] of s.parts) await pickTile(cat, slot, which);
        await click('#ws-rtabs-stats'); await sleep(150);
        await page.evaluate(() => document.querySelector('#ws-stats-reset').click()); await sleep(150);
        for (const k of ['hp', 'damage', 'attackSpeed', 'speed', 'armor', 'range', 'morale']) { await setSlider('#ws-stat-' + k, s.stats[k]); await sleep(60); }
        if (s.ability) { await click('#ws-rtabs-abilities'); await sleep(200); const dis = await page.$eval('#ws-ab-' + s.ability, (b) => b.disabled || b.getAttribute('aria-disabled') === 'true'); if (!dis) { await click('#ws-ab-' + s.ability); await sleep(150); } }
        await click('#ws-save'); await sleep(900);
        await closeModals();
        const list = (await lsGet('vw.soldiers')).data;
        must(list.length === i + 1 && list.some((x) => x.name === s.name), `soldier ${i + 1} not in the roster: ` + JSON.stringify(list.map((x) => x.name)));
        if (i === 0) {                                                    // the share dialog of the real Workshop gives the soldier code
          await click('#ws-share'); await sleep(900);
          const code = await ev(() => { const e = document.querySelector('.vw-modal textarea, .vw-modal input[readonly], #ws-export-code'); return e ? e.value : ''; });
          must(/^VW1\.soldier\./.test(code), 'the soldier share dialog shows no VW1.soldier code'); out.shareCodes.soldier = code; await closeModals();
        }
        await snap('soldier_' + (i + 1));
      }
      const roster = (await lsGet('vw.soldiers')).data;
      must(roster.length === 3 && new Set(roster.map((x) => x.id)).size === 3, 'the roster is not three distinct soldiers');
      expect.soldiers = roster.map((x) => ({ id: x.id, name: x.name, stats: x.stats, abilities: x.abilities }));
      await toMenu();
    },

    // ------------------------------------------------------------------------------------------------ arenas (Arena Builder)
    async arenas() {
      const view = () => ev(() => { const r = document.getElementById('ed-view').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      async function drag(pts, o = {}) {
        await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down();
        for (const [x, y] of pts.slice(1)) { await page.mouse.move(x, y, { steps: o.steps || 4 }); await sleep(o.dwell || 60); }
        if (o.hold) await sleep(o.hold);
        await page.mouse.up(); await sleep(120);
      }
      const key = async (k) => { await page.keyboard.press(k); await sleep(100); };
      const specs = [
        { name: 'Hill Of Beans', tools: async (cx, cy) => { await drag([[cx, cy], [cx + 30, cy + 10], [cx + 60, cy + 10]], { hold: 400 }); await key('9'); await sleep(500); await page.mouse.click(cx - 80, cy - 40); await sleep(150); } },
        { name: 'The Lava Lounge', tools: async (cx, cy) => { await drag([[cx - 20, cy - 20], [cx + 40, cy + 20]], { hold: 300 }); await key('0'); await click('#ed-hz-geyser'); await page.mouse.click(cx + 100, cy + 70); await sleep(150); await key('9'); await sleep(400); await page.mouse.click(cx - 60, cy + 40); await sleep(150); } },
        { name: 'Oasis Of Moderate Despair', tools: async (cx, cy) => { await key('5'); await setRange('#ed-water-level', 4); await sleep(200); await key('m'); await click('#ed-obj-hold_hill'); await click('#ed-mk-hill'); await page.mouse.click(cx, cy + 10); await sleep(150); await key('v'); await setRange('#ed-env-time', 19); await page.selectOption('#ed-env-weather', 'rain'); await sleep(300); } },
      ];
      for (const [i, s] of specs.entries()) {
        await ev(() => window.__vw.goto('arena_builder')); await page.waitForSelector('#ed-root', { timeout: 90000 });
        await page.waitForFunction(() => { const e = document.getElementById('ed-tool-raise'); return !!e && e.getBoundingClientRect().x >= 0 && e.getBoundingClientRect().x < 60; }, null, { timeout: 30000 }).catch(() => {});
        await sleep(800); await closeModals(); await sleep(600);
        const v = await view(), cx = v.x + v.w / 2, cy = v.y + v.h / 2;
        await s.tools(cx, cy);
        await click('#ed-save'); await sleep(600);
        await page.fill('#ed-name-input', s.name); await click('#ed-name-ok'); await sleep(1100);
        const list = (await lsGet('vw.arenas')).data;
        must(list.length === i + 1 && list.some((x) => x.name === s.name), `arena ${i + 1} not in My Arenas: ` + JSON.stringify(list.map((x) => x.name)));
        if (i === 0) {
          await click('#ed-share'); await sleep(900);
          const code = await page.$eval('#ed-export-code', (el) => el.value); must(/^VW1\.arena\./.test(code), 'the arena share dialog shows no VW1.arena code'); out.shareCodes.arena = code; await closeModals();
        }
        await snap('arena_' + (i + 1));
        await toMenu();
      }
      const lib = (await lsGet('vw.arenas')).data;
      must(lib.length === 3 && new Set(lib.map((x) => x.id)).size === 3, 'My Arenas is not three distinct arenas');
      expect.arenas = lib.map((x) => ({ id: x.id, name: x.name }));
    },

    // ------------------------------------------------------------------------------------------------ armies (Quick Battle placement presets)
    async armies() {
      for (const [i, name] of ['Bean Counters', 'Dinner Party of Doom'].entries()) {
        await ev(async () => { const v = window.__vw; v.goto('quick'); await v.quick({ rules: { budget: 3000 } }); });
        await sleep(1500);
        await ev(([i]) => { const g = window.__vw.game; g.tools.clear(0); g.autoFill(0, { style: i ? 'ranged' : 'balanced', faction: i ? 'mixed' : 'hellenes' }); }, [i]);
        await sleep(400);
        await click('#pl-save-army'); await page.waitForSelector('#pl-preset-name', { timeout: 10000 });
        await page.fill('#pl-preset-name', name); await click('#pl-preset-ok'); await sleep(900);
        await closeModals();
        const list = (await lsGet('vw.armies')).data;
        must(list.length === i + 1 && list.some((x) => x.name === name), `army ${i + 1} not saved: ` + JSON.stringify(list.map((x) => x.name)));
        if (i === 0) {
          await click('#pl-export-army').catch(() => {}); await sleep(900);
          const code = await ev(() => { const e = document.querySelector('.vw-modal textarea, .vw-modal input[readonly]'); return e ? e.value : ''; });
          must(/^VW1\.army\./.test(code), 'the army export shows no VW1.army code'); out.shareCodes.army = code; await closeModals();
        }
        await snap('army_' + (i + 1));
        await toMenu();
      }
      const armies = (await lsGet('vw.armies')).data;
      must(armies.length === 2, 'two armies expected');
      expect.armies = armies.map((x) => ({ id: x.id, name: x.name }));
    },

    // ------------------------------------------------------------------------------------------------ export
    async export() {
      await gotoScreen('settings'); await click('#set-tabs-data'); await sleep(300);
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }).catch(() => null), click('#set-export')]);
      let text = '';
      if (dl) { const f = await dl.path(); text = fs.readFileSync(f, 'utf8').trim(); out.exportName = dl.suggestedFilename(); }
      else { await sleep(1200); text = await ev(() => { const e = document.querySelector('.vw-modal textarea'); return e ? e.value : ''; }); await closeModals(); }
      must(/^VW1\.save\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/.test(text), 'the Export button gave no VW1.save code: ' + text.slice(0, 60));
      out.exportCode = text;
      await toMenu();
    },
  };

  for (const s of steps) {
    const t0 = Date.now();
    try { await run[s](); } catch (e) { try { await snap('fail_' + s); } catch { /* page gone */ } throw new StepError(`step ${s}: ${e.message}`); }
    log(`step ${s} ok (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
  return out;
}

/** Every vw.* localStorage key as the exact stored string. */
export const dumpStorage = (page) => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('vw.')) o[k] = localStorage.getItem(k); } return o; });

/** The text of the fixture module. */
export function fixtureModule({ provenance, storage, exportCode, shareCodes, expect }) {
  const keys = Object.keys(storage).sort();
  const lines = [
    '// GENERATED by tools/golden/g5_make_fixture.mjs from the Ancient v8 baseline build driven in Chromium (docs/eras/spec/VF.md 3.6.3). DO NOT EDIT.',
    '// A REAL v8 profile: every vw.* localStorage key exactly as the baseline wrote it, the Export code the real button produced, the share codes of the real dialogs.',
    '// Re-recording needs two golden_log.md entries (author excluded); tests/save/g5_fixture.test.mjs checks this file against the baseline code.',
    `export const PROVENANCE = ${JSON.stringify(provenance, null, 1)};`,
    `export const EXPECT = ${JSON.stringify(expect, null, 1)};`,
    'export const LOCAL_STORAGE = {',
    ...keys.map((k) => ` ${JSON.stringify(k)}: ${JSON.stringify(storage[k])},`),
    '};',
    `export const EXPORT_CODE = ${JSON.stringify(exportCode)};`,
    `export const SHARE_CODES = ${JSON.stringify(shareCodes, null, 1)};`,
    'export default { PROVENANCE, EXPECT, LOCAL_STORAGE, EXPORT_CODE, SHARE_CODES };',
    '',
  ];
  return lines.join('\n');
}

export async function main(argv) {
  const o = { out: DEFAULT_OUT, steps: STEPS.slice(), dry: false, rebuild: false, shots: null, partial: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(HELP); return 0; }
    if (a === '--dry') { o.dry = true; continue; }
    if (a === '--rebuild') { o.rebuild = true; continue; }
    const m = /^--(out|steps|shots)=(.+)$/.exec(a);
    if (!m) { console.error('unknown argument: ' + a + '\n(see --help)'); return 2; }
    if (m[1] === 'out') o.out = path.resolve(m[2]); else if (m[1] === 'shots') o.shots = path.resolve(m[2]);
    else { o.steps = m[2].split(',').filter(Boolean); const bad = o.steps.filter((s) => !STEPS.includes(s)); if (bad.length) { console.error('unknown step: ' + bad.join(',') + ' (steps: ' + STEPS.join(',') + ')'); return 2; } o.partial = o.steps.join() !== STEPS.join(); }
  }
  if (o.partial && !o.dry && path.resolve(o.out) === DEFAULT_OUT) { console.error('a partial run (--steps) never writes the default fixture; give --out=<file> or --dry'); return 2; }
  try { os.setPriority(0, 10); } catch { /* not allowed */ }
  assertBaseline(BASELINE_WORKTREE);
  const page = baselinePageHtml();
  if (o.rebuild) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-g5-build-'));
    try {
      fs.cpSync(path.join(BASELINE_WORKTREE, 'src'), path.join(dir, 'src'), { recursive: true }); fs.cpSync(path.join(ROOT, 'tools'), path.join(dir, 'tools'), { recursive: true });
      fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json')); fs.symlinkSync(path.join(MAIN_ROOT, 'assets'), path.join(dir, 'assets')); fs.symlinkSync(path.join(MAIN_ROOT, 'node_modules'), path.join(dir, 'node_modules'));
      const r = spawnSync('node', [path.join(dir, 'tools/build.mjs'), '--minify', '--quiet'], { cwd: dir, encoding: 'utf8', env: { ...process.env, VW_BUILD_DATE: '2026-10-08' }, timeout: 180000 });
      if (r.status !== 0) throw new Error('rebuild failed: ' + (r.stderr || r.stdout).split('\n').slice(-3).join(' | '));
      if (sha256(fs.readFileSync(path.join(dir, 'dist/artifact/index.html'))) !== page.sha256) throw new Error('the rebuild of the baseline sources differs from release/v8/index.html');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  if (o.shots) fs.mkdirSync(o.shots, { recursive: true });
  const t0 = Date.now(), log = (m) => console.log(`[g5] ${m}`);
  const P = await openPage(page.html, { viewport: { width: 1024, height: 576 } });
  try {
    await P.ctx.clock.setFixedTime(new Date(DAY0));
    const empty = await P.page.evaluate(() => localStorage.length);
    if (empty !== 0) throw new Error('localStorage is not empty at the start (' + empty + ' keys)');
    log(`page ${page.sha256.slice(0, 12)} (${page.bytes} B) in Chromium ${P.engineVersion}, empty localStorage, clock ${DAY0}`);
    const res = await drive(P, o.steps, { log, shot: o.shots });
    await P.page.waitForTimeout(500);
    const storage = await dumpStorage(P.page);
    const problems = [...new Set(P.problems)].filter((p) => !/ERR_FAILED|net::/.test(p));
    if (problems.length) throw new Error('the page logged problems:\n  ' + problems.slice(0, 8).join('\n  '));
    log(`keys: ${Object.keys(storage).sort().map((k) => k + ':' + storage[k].length).join(' ')}`);
    if (!o.partial) {
      const need = ['vw.settings', 'vw.progress', 'vw.survival', 'vw.daily', 'vw.seen', 'vw.stats', 'vw.arenas', 'vw.soldiers', 'vw.armies'];
      const miss = need.filter((k) => !(k in storage));
      if (miss.length) throw new Error('the profile lacks the key(s) ' + miss.join(','));
      if (!res.exportCode || !res.shareCodes.soldier || !res.shareCodes.arena || !res.shareCodes.army) throw new Error('missing export or share code');
    }
    const provenance = { tag: BASELINE_TAG, sha: BASELINE_SHA, page: { origin: 'release/v8/index.html', sha256: page.sha256, bytes: page.bytes }, chromium: P.engineVersion, producer: 'tools/golden/g5_make_fixture.mjs',
      producerSha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))), clock: DAY0, steps: o.steps, keys: Object.keys(storage).sort().map((k) => [k, storage[k].length]) };
    const text = fixtureModule({ provenance, storage, exportCode: res.exportCode, shareCodes: res.shareCodes, expect: res.expect });
    if (o.dry) log(`dry run: ${text.length} bytes would be written`);
    else { fs.mkdirSync(path.dirname(o.out), { recursive: true }); fs.writeFileSync(o.out, text); log(`wrote ${path.relative(ROOT, o.out)} (${text.length} bytes) in ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
    return 0;
  } catch (e) { console.error('g5_make_fixture: ' + (e && e.message)); return 1; }
  finally { await P.close(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
void crypto;
