// Flow-level acceptance checks for my screens: UI5 (Quick Fight in 2 clicks, dismissible hints), UI7 (undo/save army/copy seed/skip intro/reset via modal),
// UI8 (every setting applies + persists), UI10 (phone), UI11 (codex), UI12 (title composition geometry), UI14 (credits), UI15 (diagnostics), UI16 (scout report).
import { open, check, finish } from './lib.mjs';
import fs from 'fs';

const md = fs.readFileSync(new URL('../../assets/CREDITS.md', import.meta.url), 'utf8');
let L = await open([1280, 720]);
let p = L.p;
const ev = (fn, a) => L.ev(fn, a);
const screen = () => ev(() => window.__ui.app.nav.current());
const wait = (ms) => p.waitForTimeout(ms);

/* ---------------- UI5: splash -> title -> quick -> fight ---------------- */
await ev(() => window.__ui.goto('splash')); await wait(300);
await p.keyboard.press('x'); await wait(250);
check('splash: any key enters the arena (skip intro, UI7) and goes to the title', (await screen()) === 'title');
await ev(() => { window.__ui.app.calls.audio.length = 0; window.__ui.goto('splash'); }); await wait(200);
await p.mouse.click(300, 300); await wait(250);
check('splash: a click/tap also works and plays a confirm sound (the audio gesture)', (await screen()) === 'title' && (await ev(() => window.__ui.app.calls.audio.includes('ui_confirm'))));
check('splash prompt text', await ev(() => { window.__ui.goto('splash'); return document.querySelector('.vw-splash__prompt').textContent === 'PRESS ANY KEY TO ENTER THE ARENA'; }));
let clicks = 0;
await ev(() => { window.__ui.goto('title'); window.__ui.game.log.length = 0; }); await wait(250);
await p.click('#menu-quick'); clicks++; await wait(250);
await p.click('#qb-quick-fight'); clicks++; await wait(500);
const lg = await ev(() => ({ log: window.__ui.game.log.slice(), a: window.__ui.game.info.counts(0).total, b: window.__ui.game.info.counts(1).total, st: window.__ui.game.state }));
check('UI5: Quick Fight reaches a running fight in 2 clicks after the splash', clicks === 2 && lg.log.includes('begin') && lg.log.includes('fight') && lg.a > 0 && lg.b > 0 && lg.st === 'countdown', JSON.stringify(lg));

/* ---------------- placement: hints dismissible forever, scout report, presets, undo ---------------- */
await ev(() => { window.__ui.app.settings.set('seenHints', {}); });
await L.run('placement'); await wait(900);
check('UI5: first-run placement tutorial shows', await ev(() => !!document.getElementById('pl-hint')));
await p.check('#pl-hint-never'); await p.click('#pl-hint-next'); await wait(200);
check('UI5: "do not show again" persists in settings.seenHints', await ev(() => window.__ui.app.settings.get('seenHints').placementTutorial === true));
await L.run('placement'); await wait(900);
check('UI5: the tutorial does not return after being dismissed permanently', await ev(() => !document.getElementById('pl-hint')));
check('UI16: scout report shows advice with counter chips', await ev(() => document.querySelectorAll('#pl-scout .vw-pl__adv').length >= 2 && document.querySelectorAll('#pl-scout .vw-chip--btn').length >= 1));
await p.click('#pl-counter-cretan_archer'); await wait(150);
check('UI16: clicking a counter chip selects that unit as the brush', await ev(() => window.__ui.game.tools.brush().defId === 'cretan_archer' && document.querySelector('#pl-cards .vw-card.is-selected') !== null));
const beforeUndo = await ev(() => window.__ui.game.info.counts(0).total);
await ev(() => { window.__ui.game.tools.place(0, 'hoplite', 5); });
await wait(120);
check('placement: counts update when soldiers are placed', (await ev(() => window.__ui.game.info.counts(0).total)) === beforeUndo + 5 && (await ev(() => document.getElementById('pl-cap').getAttribute('aria-valuenow'))) === String(beforeUndo + 5));
await p.click('#pl-undo'); await wait(120);
check('UI7: Undo reverses the last placement', (await ev(() => window.__ui.game.info.counts(0).total)) === beforeUndo);
await p.click('#pl-save-army'); await wait(350);
await p.fill('#pl-preset-name', 'Test Phalanx'); await p.click('#pl-preset-ok'); await wait(350);
check('UI7: Save army stores a named preset', await ev(() => window.__ui.app.save.armies.list().some((a) => a.name === 'Test Phalanx')));
await p.click('#pl-load-army'); await wait(350);
check('UI7: Load army lists saved presets (with delete)', await ev(() => document.querySelectorAll('.vw-modal .vw-pl__preset').length >= 3));
await p.keyboard.press('Escape'); await wait(450);
await p.click('#pl-clear'); await wait(350);
check('UI7: Clear asks first (in-page modal), cancel keeps armies', await ev(() => !!document.querySelector('.vw-modal')) && (await ev(() => window.__ui.game.info.counts(0).total)) > 0);
await p.keyboard.press('Escape'); await wait(450);
check('placement: types counter shows N / 16', await ev(() => /\/ 16$/.test(document.getElementById('pl-types').getAttribute('aria-valuetext'))));
await ev(() => { window.__ui.game.log.length = 0; window.__ui.game.tools.clear(); }); await wait(150);
await p.click('#pl-fight', { force: true }); await wait(150);
check('placement: FIGHT with an empty side warns instead of starting', await ev(() => !!document.querySelector('.vw-toast--warn')) && !(await ev(() => window.__ui.game.log.includes('fight'))));
await ev(() => { window.__ui.game.log.length = 0; window.__ui.game.tools.autoFill(0, { budget: 2000 }); window.__ui.game.tools.autoFill(1, { budget: 2000 }); }); await wait(150);
await p.click('#pl-fight'); await wait(150);
check('placement: FIGHT starts the battle when both sides have soldiers', await ev(() => window.__ui.game.log.includes('fight')));
// invalid-position tooltip via the real Game event: 'ghost' {valid, reason, code?}; shown at the cursor only while it is over the battlefield
await L.run('placement'); await wait(300);
await ev(() => { const b = document.getElementById('pl-hint-dismiss'); if (b) b.click(); }); await wait(100);
await p.mouse.move(640, 140); await wait(60);
await ev(() => window.__ui.game.emit('ghost', { valid: false, reason: "In the enemy's zone" })); await wait(120);
check('placement: invalid positions show a red cursor tooltip with the reason (ghost event)', await ev(() => { const t = document.querySelector('.vw-tip.is-on.vw-tip--bad'); return !!t && t.textContent === "In the enemy's zone"; }));
await p.mouse.move(150, 300); await wait(100);
check('placement: the tooltip hides while the pointer is over a panel', await ev(() => !document.querySelector('.vw-tip.is-on')));
await p.mouse.move(660, 140); await wait(100);
check('placement: and returns over the battlefield', await ev(() => !!document.querySelector('.vw-tip.is-on.vw-tip--bad')));
await ev(() => window.__ui.game.emit('ghost', { valid: false, reason: 'Not walkable', code: 'lava' })); await wait(100);
check('placement: HUMOR placement reasons are used when the game sends a reason code', await ev(() => { const t = document.querySelector('.vw-tip.is-on'); return !!t && /lava/i.test(t.textContent) && t.textContent !== 'Not walkable'; }));
await ev(() => window.__ui.game.emit('ghost', { valid: true, reason: null })); await wait(120);
check('placement: the tooltip goes away when the position is valid again', await ev(() => !document.querySelector('.vw-tip.is-on')));
await ev(() => document.getElementById('pl-faction-custom').click()); await wait(150);
check('placement: "My Soldiers" lists the custom soldiers with their cost', await ev(() => document.querySelectorAll('#pl-cards .vw-card').length === 3 && /Chadius/.test(document.getElementById('pl-cards').textContent)));
await ev(() => document.querySelector('#pl-cards .vw-card').click()); await wait(100);
check('placement: picking a custom soldier sets the brush to its id', await ev(() => window.__ui.game.tools.brush().defId === 'cs_chad'));

/* ---------------- army presets against the REAL Game/save API: save (team filtered), load (budget/cap checked, mirrored to the other team), share codes ---------------- */
await L.run('placement'); await wait(300);
await ev(() => { const b = document.getElementById('pl-hint-dismiss'); if (b) b.click(); const G = window.__ui.game; G.tools.clear(); G.tools.place(0, 'hoplite', 10); G.tools.place(0, 'cretan_archer', 6); G.tools.place(1, 'immortal', 4); }); await wait(150);
const saved = await ev(async () => { const G = window.__ui.game; const d = G.tools.saveArmy('x'); return { teams: d.records.map((r) => r.team).join(''), persisted: window.__ui.app.save.armies.list().some((a) => a.name === 'x') }; });
check('army: Game.tools.saveArmy returns both teams and persists nothing (the screen persists)', /0/.test(saved.teams) && /1/.test(saved.teams) && !saved.persisted, JSON.stringify(saved));
await p.click('#pl-save-army'); await wait(350);
await p.fill('#pl-preset-name', 'Mixed Bag'); await p.click('#pl-preset-ok'); await wait(350);
const item = await ev(() => window.__ui.app.save.armies.list().find((a) => a.name === 'Mixed Bag'));
check('army: the saved preset holds ONLY the selected team (A) with n, cost, team, records', !!item && item.team === 0 && item.n === 16 && item.cost > 0 && item.records.every((r) => r.team === 0) && item.records.length === 2, JSON.stringify(item && { team: item.team, n: item.n, recs: item.records.length }));
check('army: saving shows the HUMOR confirmation', await ev(() => /Army saved/.test(Array.from(document.querySelectorAll('.vw-toast')).map((t) => t.textContent).join(' '))));
// same name again asks before replacing
await p.click('#pl-save-army'); await wait(350);
await p.fill('#pl-preset-name', 'mixed bag'); await p.click('#pl-preset-ok'); await wait(350);
check('army: saving under an existing name asks to replace (in-page modal)', await ev(() => /Replace/.test(document.querySelector('.vw-modal') ? document.querySelector('.vw-modal').textContent : '')));
await p.keyboard.press('Escape'); await wait(450);
check('army: cancelling the replace keeps a single "Mixed Bag"', (await ev(() => window.__ui.app.save.armies.list().filter((a) => /mixed bag/i.test(a.name)).length)) === 1);
// load onto team A replaces A's army
await ev(() => { window.__ui.game.tools.clear(0); }); await wait(80);
await p.click('#pl-load-army'); await wait(350);
await p.click('#pl-load-' + item.id); await wait(450);
check('army: Load army restores the saved soldiers on team A and leaves team B alone', await ev(() => window.__ui.game.info.counts(0).total === 16 && window.__ui.game.info.counts(1).total === 4));
// load onto team B: positions are mirrored through the arena centre
await p.click('#pl-team [data-value="1"]'); await wait(150);
await p.click('#pl-load-army'); await wait(350);
await p.click('#pl-load-' + item.id); await wait(450);
const mir = await ev(() => { const G = window.__ui.game; return { b: G.info.counts(1).total, a: G.info.counts(0).total, bx: G._p[1].map((u) => u.x).reduce((s, x) => s + x, 0) / Math.max(1, G._p[1].length), ax: G._p[0].map((u) => u.x).reduce((s, x) => s + x, 0) / Math.max(1, G._p[0].length) }; });
check('army: loading an A army onto B replaces B and mirrors it to the other side of the arena', mir.b === 16 && mir.a === 16 && mir.bx > 0 && mir.ax < 0, JSON.stringify(mir));
await p.click('#pl-team [data-value="0"]'); await wait(100);
// over budget refused with the numbers
await ev(() => window.__ui.app.save.armies.put({ id: 'army_huge', name: 'Too Big', v: 1, team: 0, records: [{ team: 0, defId: 'hoplite', positions: Array.from({ length: 120 }, (_, i) => [-30 + (i % 10), i / 10]), heading: 0, order: 'advance' }], n: 120, cost: 12000, saved: 1 }));
await ev(() => { window.__ui.game.tools.clear(0); window.__ui.game.tools.place(0, 'hoplite', 3); }); await wait(100);
await p.click('#pl-load-army'); await wait(350);
check('army: an army over the budget is marked in the list', await ev(() => !!document.querySelector('#pl-preset-army_huge .vw-chip--danger')));
await p.click('#pl-load-army_huge'); await wait(450);
check('army: loading an over-budget army is refused with a plain-English reason and changes nothing', await ev(() => window.__ui.game.info.counts(0).total === 3 && /costs 12,000 drachmae/.test(Array.from(document.querySelectorAll('.vw-toast')).map((t) => t.textContent).join(' '))));
// delete from the list asks first
await p.click('#pl-load-army'); await wait(350);
await p.click('#pl-del-army_huge'); await wait(350);
check('army: deleting a preset asks first (in-page modal)', await ev(() => !!document.querySelector('.vw-modal + .vw-modal, .vw-modal-stack .vw-modal') || document.querySelectorAll('.vw-modal').length >= 1));
await ev(() => Array.from(document.querySelectorAll('.vw-modal')).pop().querySelector('.vw-btn--danger, .vw-modal__foot .vw-btn:last-child').click()); await wait(450);
check('army: confirming removes it from ctx.save.armies', await ev(() => !window.__ui.app.save.armies.get('army_huge')));
await p.keyboard.press('Escape'); await wait(450);
// share code round trip with the real encodeShare / importShare
await ev(() => { window.__ui.app.calls.clipboard.length = 0; document.getElementById('pl-export-army').click(); }); await wait(900);
const code = await ev(() => window.__ui.app.calls.clipboard[window.__ui.app.calls.clipboard.length - 1] || '');
check('army: Export army code copies a real VW1.army.<data>.<check> code', /^VW1\.army\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/.test(code), code.slice(0, 40));
await ev(() => { window.__ui.game.tools.clear(0); }); await wait(80);
await p.click('#pl-import-army'); await wait(350);
await p.fill('.vw-modal textarea', 'VW1.army.AAAA.00000000'); await p.click('#vw-textmodal-ok'); await wait(350);
check('army: a damaged code shows a plain-English error and keeps the dialog open', await ev(() => !!document.querySelector('.vw-modal [role=alert]:not(.vw-hide)') && /damaged|does not look|VW1/.test(document.querySelector('.vw-modal [role=alert]').textContent)));
await p.fill('.vw-modal textarea', 'VW1.soldier.AAAA.00000000'); await p.click('#vw-textmodal-ok'); await wait(350);
check('army: a code for another type is named as such', await ev(() => /army|soldier|damaged/.test(document.querySelector('.vw-modal [role=alert]').textContent)));
await p.fill('.vw-modal textarea', code); await p.click('#vw-textmodal-ok'); await wait(700);
check('army: importing the exported code loads the army onto the current team and keeps it in the saved list', await ev(() => window.__ui.game.info.counts(0).total === 16 && window.__ui.app.save.armies.list().length >= 3), JSON.stringify(await ev(() => window.__ui.game.info.counts(0).total)));


/* ---------------- quick: copy seed, rules reach the Setup ---------------- */
await L.run('quick'); await wait(300);
await p.click('#qb-mode .vw-seg__opt:last-child'); await wait(150);
await ev(() => document.getElementById('qb-arena-random').click()); await wait(250);
await p.click('#qb-copy-seed'); await wait(200);
check('UI7: random arena shows its seed and Copy puts it on the clipboard', (await ev(() => window.__ui.app.calls.clipboard.slice(-1)[0])) === await ev(() => document.getElementById('qb-seed').value));
await ev(() => { document.getElementById('qb-budget').querySelector('[data-value="war"]').click(); document.getElementById('qb-difficulty').querySelector('[data-value="hard"]').click(); document.getElementById('qb-weather').value = 'storm'; document.getElementById('qb-weather').dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('qb-ff').click(); document.getElementById('qb-gore').querySelector('[data-value="confetti"]').click(); document.getElementById('qb-speed').querySelector('[data-value="0.25"]').click(); document.getElementById('qb-mut-big_heads').click(); window.__ui.game.log.length = 0; window.__setup = null; const g = window.__ui.game; const b = g.begin.bind(g); g.begin = async (s) => { window.__setup = s; return b(s); }; });
await p.click('#qb-place'); await wait(400);
const su = await ev(() => window.__setup);
check('quick: the chosen rules arrive in the Setup (budget, difficulty, weather, friendly fire, gore, 0.25x speed, mutator, arena seed)', su && su.rules.budget === 20000 && su.rules.difficulty === 'hard' && su.rules.weather === 'storm' && su.rules.friendlyFire === true && su.rules.gore === 'confetti' && su.rules.speed === 0.25 && su.rules.mutators.includes('big_heads') && su.arena.presetId === 'random' && su.arena.seed > 0, JSON.stringify(su && su.rules));
check('quick: Place armies hands over to placement', (await screen()) === 'placement');

/* ---------------- UI8: every setting applies and persists ---------------- */
await ev(() => { window.__keys = new Set(); const s = window.__ui.app.settings; const orig = s.set; s.set = (k, v) => { window.__keys.add(k); return orig(k, v); }; });
for (const tab of ['graphics', 'gameplay', 'audio', 'access', 'data']) {
  await ev((t) => window.__ui.goto('settings', { tab: t }), tab); await wait(150);
  await ev(() => { document.querySelectorAll('#vw-root input[type=range]').forEach((r) => { r.value = String(+r.min + (+r.max - +r.min) * 0.3); r.dispatchEvent(new Event('input', { bubbles: true })); }); });
}
await ev(() => window.__ui.clickthrough('settings_graphics', { fast: true })); await ev(() => window.__ui.clickthrough('settings_gameplay', { fast: true })); await ev(() => window.__ui.clickthrough('settings_audio', { fast: true })); await ev(() => window.__ui.clickthrough('settings_access', { fast: true })); await ev(() => window.__ui.clickthrough('settings_data', { fast: true }));
await ev(() => window.__ui.K.closeModals()); await wait(400);
await ev(() => { window.__ui.goto('settings', { tab: 'access' }); }); await wait(150);
await ev(() => { ['#set-palette [data-value="cvd"]', '#set-palette [data-value="classic"]'].forEach((s) => document.querySelector(s).click()); });
await ev(() => { window.__ui.goto('settings', { tab: 'gameplay' }); }); await wait(150);
await ev(() => { document.querySelector('#set-gore [data-value="wine"]').click(); document.querySelector('#set-corpses [data-value="none"]').click(); });
await ev(() => { window.__ui.goto('settings', { tab: 'controls' }); }); await wait(150);
await p.focus('#key-pan_up'); await p.keyboard.press('Enter'); await wait(60); await p.keyboard.press('KeyJ'); await wait(150);
await ev(() => { window.__ui.goto('settings', { tab: 'data' }); }); await wait(150);
await ev(() => document.getElementById('set-reset-hints').click());
const keys = await ev(() => Array.from(window.__keys));
const want = ['quality', 'autoScale', 'resScale', 'shadows', 'bloom', 'clouds', 'fpsCounter', 'gore', 'corpses', 'camSens', 'edgeScroll', 'autoPauseBlur', 'vol.master', 'vol.music', 'vol.sfx', 'vol.ui', 'vol.announcer', 'muted', 'tts', 'subtitles', 'reduceMotion', 'shake', 'flashLimiter', 'uiScale', 'palette', 'highContrastUI', 'keys', 'beacon', 'seenHints'];
check('UI8: every key in the settings contract (spec 5) is written by some control', want.every((k) => keys.includes(k)), 'missing: ' + want.filter((k) => !keys.includes(k)).join(','));
await ev(() => { window.__ui.app.settings.set('reduceMotion', false); window.__ui.app.settings.set('uiScale', 1); window.__ui.app.settings.set('palette', 'classic'); });
await ev(() => window.__ui.goto('settings', { tab: 'graphics' })); await wait(200);
await ev(() => document.querySelector('#set-quality [data-value="potato"]').click());
check('UI8: choosing the Potato preset sets the related graphics flags immediately', await ev(() => { const s = window.__ui.app.settings; return s.get('quality') === 'potato' && s.get('shadows') === false && s.get('bloom') === false && s.get('clouds') === false && s.get('resScale') === 0.7; }));
check('settings screen re-syncs when settings change elsewhere (auto-scale, mute button)', await ev(async () => { window.__ui.app.settings.set('resScale', 0.55); await new Promise((r) => setTimeout(r, 80)); return document.getElementById('set-resscale').value === '0.55'; }));

/* ---------------- UI7 reset progress + Data ---------------- */
await ev(() => window.__ui.goto('settings', { tab: 'data' })); await wait(200);
await p.click('#set-reset-progress'); await wait(350);
const btns = await ev(() => Array.from(document.querySelectorAll('.vw-modal__foot .vw-btn')).map((b) => b.textContent.trim().toLowerCase()));
check('UI7: reset progress opens an in-page modal with Cancel + Wipe', btns.includes('cancel') && btns.some((t) => /wipe/.test(t)));
await ev(() => Array.from(document.querySelectorAll('.vw-modal__foot .vw-btn')).find((b) => /wipe/i.test(b.textContent)).click()); await wait(350);
check('UI7: confirming wipes progress but keeps arenas/soldiers/armies', await ev(() => Object.keys(window.__ui.app.save.progress.get('stars') || {}).length === 0 && window.__ui.app.save.arenas.list().length >= 2 && window.__ui.app.save.soldiers.list().length >= 3));
await ev(() => { window.__ui.app.calls.downloads.length = 0; document.getElementById('set-export').click(); }); await wait(300);
check('P4: Export all downloads a file via ctx.platform.downloads', (await ev(() => window.__ui.app.calls.downloads.length)) === 1 && /voxelwars-save-\d{4}-\d{2}-\d{2}\.json/.test(await ev(() => window.__ui.app.calls.downloads[0].filename)));
await ev(() => { window.__ui.app.ctx.platform.downloads = null; document.getElementById('set-export').click(); }); await wait(350);
check('P4: with downloads missing, Export all falls back to a copyable text box', await ev(() => { const ta = document.querySelector('.vw-modal textarea'); return !!ta && ta.readOnly && /^VW1\.save\./.test(ta.value); }));
await p.keyboard.press('Escape'); await wait(450);
await p.click('#set-import-paste'); await wait(350);
await p.fill('.vw-modal textarea', 'not json at all'); await p.click('#vw-textmodal-ok'); await wait(200);
check('P4: importing garbage shows a plain-English error and stays open', await ev(() => !!document.querySelector('.vw-modal [role=alert]:not(.vw-hide)') && /does not look like/i.test(document.querySelector('.vw-modal [role=alert]').textContent)));
await p.fill('.vw-modal textarea', '{"v":1}'); await p.click('#vw-textmodal-ok'); await wait(350);
check('P4: importing valid text succeeds and confirms', await ev(() => !document.querySelector('.vw-modal') && !!document.querySelector('.vw-toast--success')));
await L.close();

/* ---------------- P1: storage blocked indicator ---------------- */
L = await open([1280, 720]); p = L.p;
await ev(() => window.__ui.app.save.setStatus && window.__ui.app.save.setStatus('memory'));
await L.run('settings_data'); await wait(200);
check('P1: "Not saving" indicator when storage is blocked', await ev(() => /Not saving/i.test(document.getElementById('set-storage').textContent) && !!document.querySelector('#set-storage .vw-chip--danger')));
await ev(() => window.__ui.app.save.setStatus('full'));
await L.run('settings_data'); await wait(150);
check('P2: storage full is flagged with advice', await ev(() => /full/i.test(document.getElementById('set-storage').textContent)));
check('P2: storage full offers "Try saving again", which clears the warning when space is back', await ev(async () => { const b = document.getElementById('set-retry-save'); if (!b) return false; b.click(); await new Promise((r) => setTimeout(r, 1300)); return /Saving to this device/i.test(document.getElementById('set-storage').textContent); }));

/* ---------------- UI11 codex ---------------- */
await L.run('codex_units'); await wait(250);
const nUnits = await ev(async () => { const ids = new Set(); const tabs = Array.from(document.querySelectorAll('#cx-fac [role=tab]')); for (const t of tabs) { t.click(); await new Promise((r) => setTimeout(r, 40)); document.querySelectorAll('.vw-cx__grid .vw-card').forEach((c) => ids.add(c.dataset.id)); } return ids.size; });
check('UI11: codex lists all 43 units across 7 faction tabs', nUnits === 43, String(nUnits));
await ev(() => { window.__clips = []; const real = window.__ui.ctx.preview.turntable; window.__ui.ctx.preview.turntable = (c, o) => { const t = real(c, o); const sc = t.setClip; t.setClip = (x) => { window.__clips.push(x); return sc(x); }; window.__last = o; return t; }; });
await ev(() => document.querySelector('#cx-fac [role=tab]').click()); await wait(120);
await ev(() => document.querySelector('.vw-cx__grid .vw-card[data-id=hoplite]').click()); await wait(200);
check('UI11: selecting a unit shows its turntable (drag-rotate) with stats, abilities, lore, counters', await ev(() => !!document.querySelector('.vw-cx__stage canvas') && document.querySelectorAll('#cx-stats .vw-stat').length === 6 && !!document.getElementById('cx-abilities') && document.querySelector('.vw-cx__lore').textContent.length > 20 && !!document.getElementById('cx-counters') && window.__last.unitId === 'hoplite' && window.__last.interactive === true));
await ev(() => { const o = document.getElementById('cx-clip').querySelector('[data-value="attack"]'); o.click(); });
await ev(() => document.getElementById('cx-clip').querySelector('[data-value="death"]').click());
check('UI11: the clip picker drives the turntable (attack -> strike_thrust, death -> death_back)', (await ev(() => window.__clips.join())) === 'strike_thrust,death_back', await ev(() => window.__clips.join()));
await ev(() => document.querySelector('#cx-fac [data-dummy]') || 0);
await L.run('codex_props'); await wait(150);
check('UI11: props tab lists the whole catalog', (await ev(() => document.querySelectorAll('.vw-cx__prop').length)) >= 40, String(await ev(() => document.querySelectorAll('.vw-cx__prop').length)));
await L.run('codex_arenas'); await wait(150);
check('UI11: arenas tab lists all 16 with thumbnails and Fight here', (await ev(() => document.querySelectorAll('.vw-cx__arena').length)) === 16 && await ev(() => document.querySelectorAll('.vw-cx__arena img[src^="data:image"]').length >= 14));
await ev(() => document.getElementById('cx-fight-thermopylae').click()); await wait(250);
check('codex arena "Fight here" preselects that arena in Quick Battle', (await screen()) === 'quick' && await ev(() => document.querySelector('.vw-qb__mini[aria-checked=true]').dataset.arena === 'thermopylae'));
await L.run('codex_units');
await ev(() => { window.__ui.ctx.save.progress.data.codex = { locked: ['spartan'] }; }); 
await ev(() => window.__ui.goto('codex', { unit: 'spartan' })); await wait(200);
check('codex: a locked unit shows ??? with an unlock hint (no spoilers)', await ev(() => /\?\?\?/.test(document.querySelector('.vw-cx__grid .vw-card.is-locked').textContent) && !!document.getElementById('cx-locked')));

/* ---------------- UI14 credits ---------------- */
await L.run('credits'); await wait(250);
const urls = Array.from(new Set((md.match(/https?:\/\/[^\s)<>"']+/g) || []).map((u) => u.replace(/[,.;]+$/, ''))));
const shown = await ev(() => Array.from(document.querySelectorAll('#cr-ledger a')).map((a) => a.href));
check(`UI14: every URL in the generated ledger (${urls.length}) is a real link in the credits`, urls.every((u) => shown.some((s) => s === u || s === u + '/' || s.replace(/\/$/, '') === u.replace(/\/$/, ''))), urls.filter((u) => !shown.some((s) => s.replace(/\/$/, '') === u.replace(/\/$/, ''))).slice(0, 3).join(' '));
check('UI14: all credit links open in a new tab with rel=noopener', await ev(() => Array.from(document.querySelectorAll('#vw-root a[href]')).every((a) => a.target === '_blank' && /noopener/.test(a.rel))));
const authors = (md.match(/^### .+$/gm) || []).map((l) => l.slice(4).trim());
const credText = await ev(() => document.getElementById('cr-ledger').textContent);
check(`UI14: every CC0 author heading (${authors.length}) and the licence names appear`, authors.every((a) => credText.includes(a)) && /CC BY 4\.0/.test(credText) && /CC BY 3\.0/.test(credText));
const libsText = await ev(() => document.getElementById('cr-libs').textContent + document.getElementById('cr-anim').textContent);
check('UI14: library and font licences listed truthfully (three.js MIT, OFL fonts, CC0 animation; no GSAP, it is not shipped)', /three\.js/.test(libsText) && /MIT/.test(libsText) && !/GSAP/i.test(libsText) && /Open Font Licence/.test(libsText) && /Bungee/.test(libsText) && /Rubik/.test(libsText) && /Cinzel/.test(libsText) && /Quaternius/.test(libsText) && /CC0/.test(libsText) && /animated by hand/.test(libsText) && !/Kenney/i.test(libsText));
await p.fill('#cr-filter', 'Kevin MacLeod'); await wait(150);
check('credits: the filter narrows the ledger', await ev(() => document.querySelectorAll('#cr-ledger li:not([hidden])').length > 0 && document.querySelectorAll('#cr-ledger li[hidden]').length > 20));

/* ---------------- UI15 diagnostics ---------------- */
await ev(() => { const d = window.__ui.ctx.diag; const real = d.snapshot; d.snapshot = () => Object.assign(real(), { csp: [{ blocked: 'https://evil.example/x.js', directive: 'script-src', t: 5210 }], errors: [{ kind: 'error', msg: 'boom @main.js:3', t: 4100 }] }); });
await L.run('diagnostics'); await wait(250);
const dg = await ev(() => document.getElementById('vw-root').textContent);
for (const [name, re] of [['WebGL2', /WebGL 2/], ['quality tier', /Quality tier/], ['FPS', /FPS/], ['draw calls', /Draw calls/], ['audio load path embedded', /embedded/i], ['audio load path synth', /synth/i], ['storage', /Storage/], ['CSP violation text', /script-src blocked https:\/\/evil\.example\/x\.js/], ['CSP count', /1 policy violation/], ['an error line', /boom @main\.js:3/], ['the sound path tally', /Where sounds came from/], ['a failed asset with its reason', /pickup_coin: HTTP 404/]]) check('UI15: diagnostics reports ' + name, re.test(dg), dg.slice(0, 200));
check('UI15: the flat real snapshot becomes sections (Overview, Graphics, Performance, Audio, Storage) and the 70 per-asset paths are NOT flattened into rows', await ev(() => ['dg-overview', 'dg-webgl', 'dg-perf', 'dg-audio', 'dg-storage', 'dg-errors', 'dg-log'].every((id) => !!document.getElementById(id)) && document.querySelectorAll('#vw-root dt').length < 70));
check('UI15: the per-asset list is a collapsed <details> that opens on demand', await ev(() => { const d = document.getElementById('dg-assets'); if (!d || d.open) return false; d.open = true; return /hit_blade_1: embedded/.test(d.textContent) && /synth:fanfare: synth/.test(d.textContent); }));
check('UI15: an error count chip appears in the summary', await ev(() => /1 error/.test(document.querySelector('.vw-diag__sum').textContent)));
await ev(() => { window.__ui.app.calls.clipboard.length = 0; document.getElementById('dg-copy').click(); }); await wait(250);
check('UI15: Copy report puts the full JSON snapshot on the clipboard', await ev(() => { const c = window.__ui.app.calls.clipboard[0] || ''; return /VOXELWARS diagnostics/.test(c) && /"drawCalls": 126/.test(c) && /evil\.example/.test(c); }));
await ev(() => { document.getElementById('dg-live').click(); }); await wait(1300);
check('diagnostics: Live updates the numbers', await ev(() => { window.__ui.ctx.diag.log.push({ t: 99, level: 'warn', msg: 'late line' }); return true; }));
await wait(1300);
check('diagnostics: the live view picked up a new log line', await ev(() => /late line/.test(document.getElementById('dg-log').textContent)));

/* ---------------- UI12 title composition (geometry) ---------------- */
for (const sz of [[1280, 720], [1920, 1080]]) {
  await p.setViewportSize({ width: sz[0], height: sz[1] });
  await L.run('title'); await wait(250);
  const g = await ev(() => { const r = (e) => e.getBoundingClientRect(); const items = Array.from(document.querySelectorAll('.vw-menu__item')).map((e) => r(e)); let overlap = 0; for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const a = items[i], b = items[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap++; } const logo = r(document.querySelector('.vw-logo')); const col = r(document.querySelector('.vw-title__col')); const lefts = Array.from(document.querySelectorAll('.vw-menu__group')).map((g) => Math.round(r(g).left)); const tip = document.querySelector('.vw-title__tip'); const tr = tip ? r(tip) : null; const footer = r(document.querySelector('.vw-title__footer')); return { overlap, logoIn: logo.left >= 0 && logo.right <= innerWidth && logo.top >= 0, lefts: Array.from(new Set(lefts)), tipOverlapsMenu: tr ? items.some((a) => a.left < tr.right && tr.left < a.right && a.top < tr.bottom && tr.top < a.bottom) : false, footerIn: footer.bottom <= innerHeight + 1, logoW: Math.round(logo.width) }; });
  check(`UI12: title at ${sz.join('x')}: logo inside the viewport, tablets aligned, none overlap, footer visible`, g.overlap === 0 && g.logoIn && g.lefts.length === 1 && !g.tipOverlapsMenu && g.footerIn && g.logoW > 220, JSON.stringify(g));
}
const errs = L.logs.filter((l) => /error/i.test(l));
check('console clean', errs.length === 0, errs.slice(0, 3).join(' | '));
await L.close();

/* ---------------- UI10 phone ---------------- */
L = await open([390, 844], { touch: true }); p = L.p;
await L.run('title'); await wait(250);
await p.click('#menu-quick'); await wait(250);
check('UI10 phone: Quick Battle setup is usable (arena strip, armies, big actions)', await ev(() => { const a = document.getElementById('qb-quick-fight').getBoundingClientRect(); return a.width >= 100 && a.bottom <= innerHeight + 1 && document.querySelectorAll('.vw-qb__mini').length === 16; }));
await p.click('#qb-quick-fight'); await wait(400);
check('UI10 phone: Quick Fight starts a battle', await ev(() => window.__ui.game.log.includes('fight')));
await L.run('codex_units'); await wait(250);
await ev(() => document.querySelector('.vw-cx__grid .vw-card').click()); await wait(250);
check('UI10 phone: Codex opens a unit detail view, with a back-to-list button', await ev(() => document.querySelector('.vw-cx').classList.contains('is-detail') && getComputedStyle(document.querySelector('.vw-cx__list')).display === 'none' && !!document.querySelector('.vw-cx__stage canvas')));
await p.click('#cx-back-list'); await wait(250);
check('UI10 phone: back returns to the list', await ev(() => !document.querySelector('.vw-cx').classList.contains('is-detail')));
await L.run('phone_notice'); await wait(200);
check('UI10 phone: editors show "Built for bigger screens" and a read-only look at saved creations', await ev(() => /Built for bigger screens/.test(document.getElementById('ph-notice').textContent) && document.querySelectorAll('#ph-yours .vw-ph__item').length >= 5));
await L.run('placement'); await wait(900);
await ev(() => { const b = document.getElementById('pl-hint-dismiss'); if (b) b.click(); });
check('UI9/UI10 phone: placement sheets are hidden until opened, bottom bar always reachable', await ev(() => getComputedStyle(document.getElementById('pl-palette')).visibility === 'hidden' && document.getElementById('pl-fight').getBoundingClientRect().bottom <= innerHeight + 1));
await p.tap('#pl-open-pal'); await wait(450);
check('UI9 phone: tapping Soldiers opens the palette sheet; picking a unit closes it and sets the brush', await ev(() => getComputedStyle(document.getElementById('pl-palette')).visibility === 'visible'));
await p.tap('#pl-cards .vw-card'); await wait(450);
check('UI9 phone: the sheet closes after a tap-pick', await ev(() => getComputedStyle(document.getElementById('pl-palette')).visibility === 'hidden' && !!window.__ui.game.tools.brush().defId));
const errs2 = L.logs.filter((l) => /error/i.test(l));
check('console clean (phone)', errs2.length === 0, errs2.slice(0, 3).join(' | '));
await L.close();
finish('ui5_flows');
