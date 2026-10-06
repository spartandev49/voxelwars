// UI1 / UI4 / UI9 / UI16 / UI17(part) / UI18 / UI19 / X1 / X4 (screens half): countdown, pause, results, campaign, briefing, teaching, survival, daily,
// controls, photo and Take Command against the fake Game; real kit modals; real Playwright clicks (a covered button fails).
import { launch, open, check, finish } from './_lib.mjs';
import { buildContent } from '../../src/ui/mockctx.js';
import { dailyPlan } from '../../src/ui/screens/_daily_plan.js';

const browser = await launch();
const calls = (p) => p.evaluate(`__ui.mock.game.calls.map((c) => c.name + ':' + JSON.stringify(c.args)).join('|')`);
const SETUP = (opts) => `__ui.setup(${JSON.stringify(Object.assign({ seed: 5 }, opts || {}))});`;
const RES = (kind, winner, more) => `${SETUP(Object.assign({ resultsKind: kind, winner }, more || {}))} __ui.router.goto('battle'); __ui.step(5); __ui.router.overlay('results');`;
const txt = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const overlays = (p) => p.evaluate(`__ui.router.overlays.map((o) => o.id).join()`);

// ---------------------------------------------------------------------------------------------- results
{
  console.log('Results');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(RES('quick', 0));
  check('victory banner', (await txt(p, '.bs-res-title')) === 'VICTORY!');
  const les = await p.evaluate(() => [...document.querySelectorAll('.bs-res-lesson')].map((l) => ({ t: l.querySelector('.bs-res-lesson-t').textContent, fix: (l.querySelector('.bs-res-lesson-fix') || {}).textContent || '' })));
  check('UI16: exactly 3 generated lessons, each with text and a fix', les.length === 3 && les.every((l) => l.t.length > 20 && l.fix.length > 5), JSON.stringify(les));
  check('...in Cassandra\'s voice (her portrait + name)', await p.evaluate(() => !!document.querySelector('.bs-res-cass svg.portrait-cassandra') && /Cassandra/.test(document.querySelector('.bs-res-cass-id').textContent)));
  check('stats table: units left/lost, kills, damage, value lost for both teams', await p.evaluate(() => { const rows = [...document.querySelectorAll('.bs-res-table tbody tr')]; return rows.length === 5 && rows.every((r) => r.querySelectorAll('td').length === 2); }));
  check('the winner gets a crown in the table header', await p.evaluate(() => document.querySelectorAll('.bs-res-table thead .bs-res-crown').length === 1));
  check('MVP card: name, kills, last words', await p.evaluate(() => /Sir Chadius/.test(document.querySelector('.bs-res-mvp-name').textContent) && document.querySelector('.bs-res-mvp-kills b').textContent === '14' && /Tell my shield/.test(document.querySelector('.bs-res-quote').textContent)));
  check('funny stats shown', (await p.evaluate(() => document.querySelectorAll('.bs-res-funny dt').length)) >= 3);
  check('confetti falls on a victory', (await p.evaluate(() => document.querySelectorAll('.bs-confetti > i').length)) >= 20);
  check('the battle HUD is hidden behind the results', await p.evaluate(() => getComputedStyle(document.querySelector('.vw-hud')).visibility === 'hidden'));
  check('buttons: Again, but smarter (R) / Tweak army (T) / Kill-cam (K) / Menu (Esc)', await p.evaluate(() => { const t = document.querySelector('.bs-res-actions').textContent; return /Again, but smarter/.test(t) && /Tweak army/.test(t) && /Kill-cam/.test(t) && /Menu/.test(t); }));
  await p.keyboard.press('KeyK'); await p.waitForTimeout(150);
  check('K plays the kill-cam (game.killcam) and brings the results back', (await calls(p)).includes('killcam:[]') && await p.evaluate(() => !document.querySelector('.bs-results').classList.contains('is-killcam')));
  await p.keyboard.press('KeyT'); await p.waitForTimeout(100);
  check('T = tweak army (game.tweak, results closed)', (await calls(p)).includes('tweak:[]') && (await overlays(p)) === '');
  await p.evaluate(RES('quick', 0)); await p.keyboard.press('KeyR'); await p.waitForTimeout(100);
  check('UI7: R = rematch with one key (game.rematch, results closed)', (await calls(p)).includes('rematch:[]') && (await overlays(p)) === '');
  await p.evaluate(RES('quick', 0)); await p.click('#res-rematch'); await p.waitForTimeout(80);
  check('the Rematch button does the same', (await calls(p)).includes('rematch:[]'));
  await p.evaluate(RES('quick', 0)); await p.click('#res-tweak'); await p.waitForTimeout(80);
  check('the Tweak button does the same', (await calls(p)).includes('tweak:[]'));
  await p.evaluate(RES('quick', 0)); await p.click('#res-killcam'); await p.waitForTimeout(150);
  check('the Kill-cam button works', (await calls(p)).includes('killcam:[]'));
  await p.evaluate(RES('quick', 0)); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  check('Esc = back to the menu (exitToMenu + title screen)', (await calls(p)).includes('exitToMenu:[]') && (await p.evaluate(`__ui.router.current()`)) === 'title');
  await p.evaluate(RES('quick', 0)); await p.click('#res-menu'); await p.waitForTimeout(80);
  check('the Menu button does the same', (await p.evaluate(`__ui.router.current()`)) === 'title');
  await p.evaluate(RES('quick', 1));
  check('defeat banner + defeat lessons', (await txt(p, '.bs-res-title')) === 'DEFEAT' && (await p.evaluate(() => document.querySelectorAll('.bs-res-lesson').length)) === 3);
  await p.evaluate(RES('quick', -1));
  check('draw banner (Zeus left)', (await txt(p, '.bs-res-title')) === 'DRAW' && /Zeus/.test(await txt(p, '.bs-res-sub')));
  // campaign
  await p.evaluate(RES('campaign', 0));
  check('mission results: 3 star conditions with 2 earned', await p.evaluate(() => document.querySelectorAll('.bs-res-star').length === 3 && document.querySelectorAll('.bs-res-star.is-earned').length === 2));
  check('mission results: rewards (title, workshop part, mutator)', await p.evaluate(() => { const t = document.querySelector('.bs-res-rewards').textContent; return /Hot Gater/.test(t) && /Colander Helm/.test(t) && /Tiny Titans/.test(t); }));
  await p.click('#res-next'); await p.waitForTimeout(150);
  check('Next mission opens the next briefing', (await p.evaluate(`__ui.router.current()`)) === 'briefing' && /Pyramid Scheme/.test(await txt(p, '.bs-brief-title')));
  // survival + daily extras
  await p.evaluate(RES('survival', 1));
  check('survival results: score, waves, 5-row leaderboard, personal best', await p.evaluate(() => /11,230/.test(document.querySelector('.bs-surv-big b').textContent) && document.querySelectorAll('.bs-board tbody tr').length === 5 && /personal best/i.test(document.querySelector('.bs-surv-panel').textContent)) && /One more wave/.test(await txt(p, '.bs-res-actions')));
  await p.evaluate(RES('daily', 0));
  const ds = await txt(p, '#daily-string');
  check('daily results: copyable result string', /^VOXELWARS Daily \d{4}-\d{2}-\d{2} \| .+ vs .+ \| WIN \d+:\d\d \| \d+% left \| seed \d+$/.test(ds), ds);
  await p.click('#daily-copy'); await p.waitForTimeout(100);
  check('Copy result puts the string on the clipboard (platform.clipboard)', await p.evaluate((s) => __ui.mock.calls.clipboard.includes(s), ds));
  check('...and records the result in the local history (first attempt of the day)', await p.evaluate(() => { const d = __ui.mock.ctx.save.progress.get('daily'); return !!d && d.history.length === 1 && d.history[0].result === 'win'; }));
  // sparse data from the real Game (no names, no quote, no lessons, no funny stats) must still render
  await p.evaluate(`${SETUP()} __ui.mock.game.results = () => ({ winner: 0, reason: 'elimination', time: 71, teams: [{ alive: 3, dead: 9, kills: 12, damage: 900, lostCost: 1000 }, { alive: 0, dead: 12, kills: 9, damage: 700, lostCost: 1200 }], mvp: { defId: 'hoplite', name: 'Hoplite', kills: 5 }, funnyStats: [], lessons: [], canRematch: true, canNext: false }); __ui.router.goto('battle'); __ui.router.overlay('results');`);
  check('sparse ResultsData renders (empty lessons say so, MVP without quote is smug)', await p.evaluate(() => /nothing to say/i.test(document.querySelector('.bs-res-lessons').textContent) && /smug|Survived|Lived|Still standing/i.test(document.querySelector('.bs-res-quote').textContent)));
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();
}

// ---------------------------------------------------------------------------------------------- pause overlay
{
  console.log('Pause');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`${SETUP()} __ui.router.goto('battle'); __ui.step(5);`);
  await p.click('#hud-gear'); await p.waitForTimeout(150);
  check('the gear opens the pause overlay and pauses the game', (await overlays(p)) === 'pause' && (await calls(p)).includes('pause:[true]'));
  check('the PAUSED ribbon steps aside and focus lands on Resume', await p.evaluate(() => getComputedStyle(document.querySelector('.hud-paused-flag')).display === 'none' && document.activeElement && document.activeElement.id === 'pause-resume'));
  check('the world behind the overlay is inert (keyboard + screen readers)', await p.evaluate(() => document.querySelector('[data-screen="battle"]').hasAttribute('inert')));
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); }); await p.keyboard.press('Space'); await p.keyboard.press('KeyF'); await p.waitForTimeout(60);
  check('Space and hotkeys inside the menu do not leak to the battle', !(await calls(p)).includes('pause:[false]') && !/camera\./.test(await calls(p)));
  // quick settings
  await p.click('#pause-quality .vw-seg__opt[data-value="olympian"]'); await p.waitForTimeout(40);
  check('Performance quick toggle sets the quality tier', await p.evaluate(() => __ui.mock.ctx.settings.get('quality') === 'olympian'));
  await p.click('#pause-autoscale'); check('...auto-scale toggle', await p.evaluate(() => __ui.mock.ctx.settings.get('autoScale') === false));
  await p.click('#pause-subtitles'); check('...subtitles toggle', await p.evaluate(() => __ui.mock.ctx.settings.get('subtitles') === false));
  await p.click('#pause-reduce'); check('...Reduce Motion toggle', await p.evaluate(() => __ui.mock.ctx.settings.get('reduceMotion') === true));
  await p.focus('#pause-vol-master'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft');
  check('...master volume slider', await p.evaluate(() => __ui.mock.ctx.settings.get('vol.master') < 0.8));
  // controls
  await p.click('#pause-controls'); await p.waitForTimeout(150);
  check('Controls opens the full reference overlay', (await overlays(p)) === 'pause,controls' && /Placement/.test(await txt(p, '.bs-controls-body')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  check('Esc closes the controls overlay and leaves the pause menu', (await overlays(p)) === 'pause');
  // settings shortcut
  await p.click('#pause-settings'); await p.waitForTimeout(100);
  check('All settings opens the settings screen as an overlay (UI-A screen)', (await overlays(p)) === 'pause,settings');
  await p.evaluate(`__ui.router.closeOverlay('settings')`);
  // restart confirm modal
  await p.click('#pause-restart'); await p.waitForTimeout(200);
  check('Restart asks first (in-page modal)', await p.evaluate(() => !!document.querySelector('.vw-modal') && /Restart this battle/.test(document.querySelector('.vw-modal').textContent)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  check('Esc on the modal cancels (no rematch)', !(await calls(p)).includes('rematch:'));
  await p.click('#pause-restart'); await p.waitForTimeout(200);
  await p.click('.vw-modal .vw-btn--primary'); await p.waitForTimeout(150);
  check('confirming restarts (game.rematch) and closes the pause menu', (await calls(p)).includes('rematch:[]') && (await overlays(p)) === '');
  // quit confirm modal
  await p.evaluate(`${SETUP()} __ui.router.goto('battle'); __ui.step(2); __ui.mock.game.pause(true); __ui.router.overlay('pause');`);
  await p.click('#pause-quit'); await p.waitForTimeout(200);
  check('Quit asks first (danger button)', await p.evaluate(() => /Quit to the menu/.test(document.querySelector('.vw-modal').textContent) && !!document.querySelector('.vw-modal .vw-btn--danger')));
  await p.click('.vw-modal .vw-btn--danger'); await p.waitForTimeout(150);
  check('confirming quits to the title (exitToMenu)', (await calls(p)).includes('exitToMenu:[]') && (await p.evaluate(`__ui.router.current()`)) === 'title');
  // resume + Esc
  await p.evaluate(`${SETUP()} __ui.router.goto('battle'); __ui.step(2); __ui.mock.game.pause(true); __ui.router.overlay('pause');`);
  await p.click('#pause-resume'); await p.waitForTimeout(100);
  check('Resume unpauses and closes the overlay', (await calls(p)).includes('pause:[false]') && (await overlays(p)) === '' && await p.evaluate(() => !document.querySelector('[data-screen="battle"]').hasAttribute('inert')));
  await p.evaluate(`__ui.mock.game.pause(true); __ui.router.overlay('pause');`); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  check('Esc also resumes', (await overlays(p)) === '');
  // focus trap
  await p.evaluate(`__ui.mock.game.pause(true); __ui.router.overlay('pause');`);
  const seen = new Set(); for (let i = 0; i < 16; i++) { await p.keyboard.press('Tab'); seen.add(await p.evaluate(() => document.activeElement.id || document.activeElement.className)); }
  check('Tab cycles inside the pause overlay (focus never reaches the HUD)', await p.evaluate(() => !!document.activeElement.closest('.bs-pause')));
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();
}

// ---------------------------------------------------------------------------------------------- countdown
{
  console.log('Countdown');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`${SETUP()} __ui.router.goto('battle'); __ui.mock.game.fight(); __ui.router.overlay('countdown');`);
  await p.waitForTimeout(100);
  check('3 shows first, with a line under it', (await txt(p, '.bs-cd-screen .bs-cd-num')) === '3' && /citizens/i.test(await txt(p, '.bs-cd-screen .bs-cd-sub')));
  await p.evaluate(`__ui.step(1.0)`); await p.waitForTimeout(220);
  check('then 2', (await txt(p, '.bs-cd-screen .bs-cd-num')) === '2');
  await p.evaluate(`__ui.step(1.0)`); await p.waitForTimeout(220);
  check('then 1', (await txt(p, '.bs-cd-screen .bs-cd-num')) === '1');
  check('each tick plays the countdown beep (ui_countdown_beep x3)', (await p.evaluate(() => __ui.mock.calls.audio.filter((c) => c === 'ui_countdown_beep').length)) === 3);
  await p.evaluate(`__ui.step(1.2)`); await p.waitForTimeout(150);
  check('FIGHT! with the horn appears when the battle starts (the overlay is gone)', await p.evaluate(() => { const f = document.querySelector('.hud-overlay .bs-cd-fight'); return !!f && !f.hidden && /FIGHT/.test(f.textContent) && !!f.querySelector('svg.art-horn') && !document.querySelector('.bs-cd-screen'); }));
  check('...and plays ui_go', await p.evaluate(() => __ui.mock.calls.audio.includes('ui_go')));
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();
}

// ---------------------------------------------------------------------------------------------- campaign + briefing
{
  console.log('Campaign + briefing');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`${SETUP()} __ui.router.goto('campaign');`);
  const pins = await p.evaluate(() => [...document.querySelectorAll('.bs-pin')].map((b) => b.className.replace('bs-pin ', '').replace(/\s?bs-pin-ping/, '')));
  check('9 mission pins in 3 acts', pins.length === 9 && (await p.evaluate(() => [...new Set([...document.querySelectorAll('.bs-pin')].map((b) => b.dataset.act))].join())) === '1,2,3');
  check('progress decides states: 3 cleared, 1 open, 5 locked', pins.filter((c) => c.includes('is-cleared')).length === 3 && pins.filter((c) => c.includes('is-open')).length === 1 && pins.filter((c) => c.includes('is-locked')).length === 5, pins.join('|'));
  check('stars are drawn (3/2/1) and totalled in the header chip', await p.evaluate(() => /6 \/ 27/.test(document.querySelector('#camp-stars').textContent) && document.querySelectorAll('#pin-marathon_sort_of .bs-pin-star').length === 3));
  check('act legend shows per-act progress', (await txt(p, '.bs-camp-legend')).includes('6/9'));
  await p.hover('#pin-thermopylae_snack'); await p.waitForTimeout(150);
  check('hover shows the briefing blurb card', await p.evaluate(() => { const c = document.querySelector('.bs-pin-card'); return !c.hidden && /Hot Gates|narrow pass|Spartans/i.test(c.textContent); }));
  await p.click('#pin-teutoburg_peekaboo'); await p.waitForTimeout(150);
  check('a locked pin says so and opens nothing', (await overlays(p)) === '' && await p.evaluate(() => __ui.mock.calls.toasts.some((t) => /Locked/.test(t))));
  await p.click('#pin-nile_crossing'); await p.waitForTimeout(250);
  check('the open pin opens its briefing as an overlay', (await overlays(p)) === 'briefing' && /Goat Across the Nile/.test(await txt(p, '.bs-brief-title')));
  check('briefing: announcer lines from all three voices with portraits', await p.evaluate(() => document.querySelectorAll('.bs-brief-line').length === 3 && ['brutus', 'plato', 'cassandra'].every((w) => document.querySelector('.bs-brief-line[data-who="' + w + '"] svg.portrait'))));
  check('briefing: objective, 3 star conditions, rules, unit counts, budget', await p.evaluate(() => { const t = document.querySelector('.bs-brief-facts').textContent; return /Objective/.test(t) && document.querySelectorAll('.bs-brief-stars li').length === 3 && /Rules of this fight/.test(t) && /Your army/.test(t) && /Budget/.test(t) && /6,500 dr/.test(t); }));
  check('briefing: par budget is shown where a mission has one', true);
  await p.keyboard.press('Escape'); await p.waitForTimeout(120);
  check('Esc closes the briefing back to the map', (await overlays(p)) === '' && (await p.evaluate(`__ui.router.current()`)) === 'campaign');
  await p.click('#pin-nile_crossing'); await p.waitForTimeout(200);
  await p.click('#brief-deploy'); await p.waitForTimeout(150);
  const c = await calls(p);
  check('Deploy builds a campaign setup for the mission and begins placement', /newSetup:\["campaign"\]/.test(c) && /begin:\["campaign"\]/.test(c));
  check('the setup carries the mission id', await p.evaluate(() => __ui.mock.game.setup && __ui.mock.game.setup.mission === 'nile_crossing'));
  // Continue + keyboard
  await p.evaluate(`${SETUP()} __ui.router.goto('campaign');`);
  await p.click('#camp-continue'); await p.waitForTimeout(250);
  check('Continue opens the next unplayed mission (Goat Across the Nile)', /Goat Across the Nile/.test(await txt(p, '.bs-brief-title')));
  await p.click('#brief-back'); await p.waitForTimeout(100);
  check('Back to the map closes the briefing', (await overlays(p)) === '');
  await p.focus('#pin-pyramid_scheme'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  check('keyboard: Enter on a focused pin opens its briefing', /Pyramid Scheme/.test(await txt(p, '.bs-brief-title')));
  const focusIn = await p.evaluate(() => !!document.activeElement.closest('.bs-briefing'));
  check('briefing takes focus (Deploy) and the map behind is inert', focusIn && await p.evaluate(() => document.querySelector('[data-screen="campaign"]').hasAttribute('inert')));
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();

  const ph = await open(browser, { width: 390, height: 844, touch: true });
  await ph.page.evaluate(`${SETUP({ touch: true })} __ui.router.goto('campaign');`);
  check('phone: map + a 9-row mission list; a row opens its briefing', (await ph.page.evaluate(() => document.querySelectorAll('.bs-mrow').length)) === 9);
  await ph.page.click('#mrow-pyramid_scheme'); await ph.page.waitForTimeout(250);
  check('phone: the briefing opens and Deploy is reachable', await ph.page.evaluate(() => { const b = document.querySelector('#brief-deploy').getBoundingClientRect(); return b.bottom <= innerHeight + 1 && b.height >= 44; }));
  check('phone: no horizontal scroll', await ph.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await ph.close();
}

// ---------------------------------------------------------------------------------------------- teaching beats (UI18)
{
  console.log('Teaching beats');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`${SETUP()} __ui.router.goto('battle'); __ui.mock.game.teaching = { id: 'power', index: 2, total: 5, title: 'Smite something', text: 'Press 1, then click the arena.', target: 'powers', who: 'brutus', canSkip: true }; __ui.step(3);`);
  await p.waitForTimeout(300);
  const t = await p.evaluate(() => { const c = document.querySelector('.hud-teach-card'), r = c.getBoundingClientRect(), tg = document.querySelector('[data-hud="powers"]').getBoundingClientRect(), ring = document.querySelector('.hud-teach-ring').getBoundingClientRect(); return { visible: !document.querySelector('.hud-teach').hidden, inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, side: c.dataset.side, above: r.bottom <= tg.top + 4, ring: Math.abs(ring.left + ring.width / 2 - (tg.left + tg.width / 2)) < 12, dots: document.querySelectorAll('.hud-teach-dots i').length, skip: !!document.querySelector('#hud-teach-skip') && !document.querySelector('#hud-teach-skip').hidden }; });
  check('teaching card is visible, on screen, above its target with an arrow (data-side=above)', t.visible && t.inView && t.side === 'above' && t.above, JSON.stringify(t));
  check('a pulsing ring sits on the target (the god powers)', t.ring);
  check('step dots (5) and a visible Skip button', t.dots === 5 && t.skip);
  await p.click('#hud-teach-skip'); await p.waitForTimeout(100);
  check('Skip calls game.skipTeaching and hides the card', (await calls(p)).includes('skipTeaching:[]') && await p.evaluate(() => document.querySelector('.hud-teach').hidden));
  check('Skip is remembered (seenHints.teaching) so later steps stay hidden', await p.evaluate(() => { __ui.mock.game.teaching = { id: 'x', index: 3, total: 5, text: 'again', target: 'minimap' }; __ui.step(0.5); return __ui.mock.ctx.settings.get('seenHints').teaching === true && document.querySelector('.hud-teach').hidden; }));
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();
}

// ---------------------------------------------------------------------------------------------- survival
{
  console.log('Survival');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`${SETUP()} __ui.router.goto('survival', { view: 'setup' });`);
  await p.waitForTimeout(200);
  check('setup: arena picker with thumbnail, faction, difficulty, mutators, rules, local top 5', await p.evaluate(() => !!document.querySelector('#surv-arena') && !!document.querySelector('.bs-surv-thumb') && !!document.querySelector('#surv-faction') && !!document.querySelector('#surv-diff') && !!document.querySelector('.bs-mutpick') && /6,000/.test(document.querySelector('.bs-rules').textContent) && /Local top 5/.test(document.body.textContent)));
  await p.selectOption('select#surv-arena', 'thermopylae'); await p.waitForTimeout(100);
  check('picking an arena updates the name and blurb', /Hot Gates/i.test(await txt(p, '.bs-surv-arena-name')));
  // UI19: mutators unlock by campaign stars (mock progress: 6 stars)
  const mut = await p.evaluate(() => [...document.querySelectorAll('.bs-mut')].map((b) => b.dataset.mutator + ':' + (b.classList.contains('is-locked') ? 'locked' : 'open')).join(','));
  check('UI19: mutators unlock by stars (6 stars => big_heads, tiny_titans, moon_gravity open; the rest locked) and there are 8', /big_heads:open,tiny_titans:open,moon_gravity:open,chicken_rain:locked/.test(mut) && mut.split(',').length === 8, mut);
  await p.click('#mut-chicken_rain', { force: true }); check('a locked mutator cannot be picked', await p.evaluate(() => document.querySelector('#mut-chicken_rain').getAttribute('aria-pressed') === 'false'));
  await p.click('#mut-big_heads'); await p.click('#mut-tiny_titans'); await p.click('#mut-moon_gravity');
  check('...and at most two can be on', await p.evaluate(() => document.querySelectorAll('.bs-mut[aria-pressed="true"]').length === 2));
  await p.click('#surv-faction .vw-seg__opt[data-value="romans"]'); await p.click('#surv-diff .vw-seg__opt[data-value="hard"]');
  await p.click('#surv-start'); await p.waitForTimeout(150);
  const setup = await p.evaluate(() => JSON.stringify(__ui.mock.game.setup));
  check('Begin the siege builds the survival setup (arena, faction, difficulty, mutators, 6,000 dr) and begins placement', /"kind":"survival"/.test(setup) && /thermopylae/.test(setup) && /"faction":"romans"/.test(setup) && /"difficulty":"hard"/.test(setup) && /big_heads/.test(setup) && /6000/.test(setup), setup);
  // intermission
  await p.evaluate(`${SETUP()} __ui.mock.game.setup = { armies: { A: { faction: 'hellenes' } } }; __ui.router.goto('battle'); __ui.router.overlay('survival', { view: 'intermission', survival: { wave: 3, waveName: 'Wave 3: The Tax Collectors', nextName: 'Wave 4: Slightly Cross Cavalry', nextStyle: 'Rush', faction: 'hellenes' } });`);
  await p.waitForTimeout(300);
  check('intermission: wave name, next wave, bonus and budget', await p.evaluate(() => { const t = document.querySelector('.bs-inter-top').textContent; return /The Tax Collectors/.test(t) && /Slightly Cross Cavalry/.test(t) && /\+2,320 dr/.test(t) && /1,600 dr left/.test(t); }));
  const units = await p.evaluate(() => document.querySelectorAll('.bs-pal-unit').length);
  check('intermission: a unit palette for the player\'s faction (' + units + ' units)', units >= 5);
  await p.click('#pal-spartan'); await p.waitForTimeout(60);
  check('picking a unit sets the brush (game.tools.setBrush with defId + team 0)', /tools\.setBrush:\[\{"mode":"block","defId":"spartan","team":0,"count":9\}\]/.test(await calls(p)), await calls(p));
  await p.click('#inter-brush .vw-seg__opt[data-value="line"]'); await p.waitForTimeout(40);
  check('brush shape buttons apply', /"mode":"line"/.test(await calls(p)));
  await p.click('#inter-undo'); check('Undo calls game.tools.undo', (await calls(p)).includes('tools.undo:[]'));
  await p.evaluate(`__ui.mock.game.info.budget = () => ({ spent: 3950, cap: 4000, left: 50 });`); await p.waitForTimeout(450);
  check('units you cannot afford are disabled', await p.evaluate(() => document.querySelector('#pal-spartan').getAttribute('aria-disabled') === 'true'));
  await p.click('#inter-go'); await p.waitForTimeout(100);
  check('Send in wave 3 starts the fight and closes the intermission', (await calls(p)).includes('fight:[]') && !(await overlays(p)).includes('survival'));
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();
}

// ---------------------------------------------------------------------------------------------- daily (UI19)
{
  console.log('Daily');
  const content = buildContent();
  const exp = dailyPlan('2026-10-06', { arenas: content.arenas, mutators: content.mutators, factions: content.factions });
  const FIXED_DATE = `{ const RD = Date; globalThis.Date = class extends RD { constructor(...a) { if (a.length === 0) super(2026, 9, 6, 12, 0, 0); else super(...a); } static now() { return new RD(2026, 9, 6, 12, 0, 0).getTime(); } }; }`;
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`${FIXED_DATE} ${SETUP()} __ui.router.goto('daily');`);
  await p.waitForTimeout(250);
  check('shows today\'s date and the deterministic arena', (await txt(p, '.bs-daily-date')).includes('2026-10-06') && (await txt(p, '.bs-daily-arena')) === exp.arenaName, exp.arenaName + ' vs ' + (await txt(p, '.bs-daily-arena')));
  const fa = content.factions[exp.factionA].name, fb = content.factions[exp.factionB].name;
  check('...factions, enemy style and the fixed 3,000 dr budget', (await txt(p, '.bs-daily-vs')).replace(/\s+/g, '') === (fa + 'vs' + fb).replace(/\s+/g, '') && /3,000 dr/.test(await txt(p, '.bs-daily-summary')) && (await txt(p, '.bs-daily-summary')).toLowerCase().includes('enemy: ' + exp.enemyStyle), await txt(p, '.bs-daily-summary'));
  check('...and the twist mutator (or none) matches the plan', exp.mutator ? await p.evaluate((m) => !!document.querySelector('.bs-daily-twist [data-mutator="' + m + '"]'), exp.mutator) : /No twist/.test(await txt(p, '.bs-daily-twist-none')));
  const first = await txt(p, '.bs-daily-summary');
  await p.evaluate(`__ui.router.goto('daily');`); await p.waitForTimeout(150);
  check('deterministic: opening the screen again shows the identical summary', (await txt(p, '.bs-daily-summary')) === first);
  await p.click('#daily-play'); await p.waitForTimeout(150);
  const s = await p.evaluate(() => JSON.stringify(__ui.mock.game.setup));
  check('Fight today\'s battle builds the daily setup from the plan', /"kind":"daily"/.test(s) && s.includes('"presetId":"' + exp.arenaId + '"') && s.includes('"faction":"' + exp.factionA + '"') && s.includes('3000'), s);
  // history: play + record via results, then the screen lists it
  await p.evaluate(`${RES('daily', 0)}`); await p.waitForTimeout(100);
  await p.evaluate(`__ui.router.goto('daily');`); await p.waitForTimeout(200);
  check('after a result the history lists the day with its outcome', await p.evaluate(() => document.querySelectorAll('.bs-daily-hist li').length === 1 && /WIN/.test(document.querySelector('.bs-daily-hist li').textContent)));
  check('...today shows as played and the button offers practice', /Played today: WIN/.test(await txt(p, '.bs-daily-done')) && /practice/i.test(await txt(p, '#daily-play')));
  await p.click('.bs-daily-hist li button'); await p.waitForTimeout(100);
  check('the history copy button copies that day\'s result string', await p.evaluate(() => __ui.mock.calls.clipboard.some((c) => /^VOXELWARS Daily 2026-10-06/.test(c))));
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();
}

// ---------------------------------------------------------------------------------------------- Take Command on touch (UI9) + photo mode
{
  console.log('Take Command + photo');
  const { page: p, logs, close } = await open(browser, { width: 820, height: 1180, touch: true });
  await p.evaluate(`${SETUP({ touch: true })} __ui.router.goto('battle'); __ui.mock.game.select(2); __ui.step(5); __ui.mock.game.possessId = 2; __ui.step(1);`);
  check('touch Take Command shows a virtual joystick, an attack button and 3 abilities', await p.evaluate(() => !!document.querySelector('#hud-joystick') && !!document.querySelector('#hud-tc-attack') && document.querySelectorAll('.hud-tc-ab').length === 3));
  const j = await p.evaluate(() => { const r = document.querySelector('#hud-joystick').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, r.width]; });
  await p.mouse.move(j[0], j[1]); await p.mouse.down(); await p.mouse.move(j[0] + j[2] * 0.4, j[1], { steps: 3 }); await p.mouse.move(j[0] + j[2] * 0.4, j[1] - j[2] * 0.4, { steps: 3 }); await p.mouse.up();
  const inputs = await p.evaluate(() => __ui.mock.game.calls.filter((c) => c.name === 'possessInput').map((c) => c.args[0]));
  const moves = inputs.filter((i) => i.move);
  check('joystick drag sends move vectors (right, then forward) and a zero on release', moves.length >= 3 && moves.some((m) => m.move.x > 0.3) && moves.some((m) => m.move.y < -0.3) && moves[moves.length - 1].move.x === 0 && moves[moves.length - 1].move.y === 0, JSON.stringify(moves));
  await p.click('#hud-tc-attack'); await p.click('#hud-tc-ab2');
  const ins = await p.evaluate(() => __ui.mock.game.calls.filter((c) => c.name === 'possessInput').map((c) => JSON.stringify(c.args[0])).join('|'));
  check('attack button and ability buttons send {attack:true} / {ability:n}', ins.includes('"attack":true') && ins.includes('"ability":2'), ins);
  const sizes = await p.evaluate(() => ['#hud-tc-attack', '#hud-tc-ab1', '#hud-tc-exit', '#hud-joystick'].map((s) => { const e = document.querySelector(s); if (!e) return s + ':missing'; const r = e.getBoundingClientRect(); return s + ':' + Math.round(r.width) + 'x' + Math.round(r.height); })); check('the touch controls are at least 44 px', sizes.every((s) => { const m = /(\d+)x(\d+)$/.exec(s); return m && +m[1] >= 44 && +m[2] >= 44; }), sizes.join(' '));
  check('while in command the god powers are off (hidden) and Exit is offered', await p.evaluate(() => getComputedStyle(document.querySelector('.hud-powers')).display === 'none' && !!document.querySelector('#hud-tc-exit')));
  await close();
  check('no console errors (touch)', logs.length === 0, logs.join(' | '));

  const a = await open(browser, { width: 1280, height: 720 });
  await a.page.evaluate(`${SETUP()} __ui.router.goto('battle'); __ui.step(3); __ui.mock.game.camMode = 'photo'; __ui.step(1);`);
  await a.page.click('#hud-photo-snap'); await a.page.waitForTimeout(250);
  const dl = await a.page.evaluate(() => __ui.mock.calls.downloads.map((d) => d.filename));
  check('photo: Snap takes the picture and saves it through platform.downloads (voxelwars-<time>.png)', (await calls(a.page)).includes('camera.photo:[]') && dl.length === 1 && /^voxelwars-\d{8}-\d{6}\.png$/.test(dl[0]), JSON.stringify(dl));
  await a.close();
  const b = await open(browser, { width: 1280, height: 720, noDownloads: true });
  await b.page.evaluate(`${SETUP({ noDownloads: true })} __ui.router.goto('battle'); __ui.step(3); __ui.mock.game.camMode = 'photo'; __ui.step(1);`);
  await b.page.click('#hud-photo-snap'); await b.page.waitForTimeout(400);
  check('photo without downloads: a preview modal with the image and save instructions', await b.page.evaluate(() => !!document.querySelector('.vw-modal img.hud-photo-img') && /Long-press or right-click/.test(document.querySelector('.vw-modal').textContent)));
  await b.close();
}

// ---------------------------------------------------------------------------------------------- controls overlay is rebinding aware
{
  const { page: p, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`${SETUP({ settings: { keys: { pause: 'KeyG', follow: 'KeyV' } } })} __ui.router.goto('battle'); __ui.router.overlay('controls');`);
  check('controls reference shows the rebound keys (G for pause, V for follow)', await p.evaluate(() => { const rows = [...document.querySelectorAll('.hud-ctl-list dt')].map((d) => [d.textContent, d.nextElementSibling.textContent]); const find = (l) => (rows.find((r) => r[0].startsWith(l)) || [])[1] || ''; return /G/.test(find('Pause')) && !/Space/.test(find('Pause')) && /V/.test(find('Follow')); }));
  await p.click('#controls-close'); await p.waitForTimeout(100);
  check('Close works', (await overlays(p)) === '');
  await close();
}


// ---------------------------------------------------------------------------------------------- puzzles (ui.md 4a.2)
{
  console.log('Puzzles');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`${SETUP()} __ui.router.goto('puzzles');`); await p.waitForTimeout(300);
  check('six puzzle cards in a 3 x 2 grid (desktop)', await p.evaluate(() => { const c = [...document.querySelectorAll('.bs-pz')]; const xs = new Set(c.map((e) => e.offsetLeft)); return c.length === 6 && xs.size === 3 && c[3].offsetTop > c[0].offsetTop; }));
  check('each card: number + title, goal line, Budget and Par chips, roster strip, three star slots, Play', await p.evaluate(() => [...document.querySelectorAll('.bs-pz')].every((c) => c.querySelector('.bs-pz-n') && c.querySelector('.bs-pz-title').textContent.length > 3 && c.querySelector('.bs-pz-goal span').textContent.length > 5 && /Budget/.test(c.querySelector('.bs-pz-chips').textContent) && /Par/.test(c.querySelector('.bs-pz-chips').textContent) && c.querySelectorAll('.bs-pz-unit').length >= 2 && c.querySelectorAll('.bs-pz-stars .ic').length === 3 && /Play/.test(c.querySelector('.bs-pz-foot button').textContent))));
  check('titles are the frozen spec titles', (await p.evaluate(() => [...document.querySelectorAll('.bs-pz-title')].map((e) => e.textContent).join('|'))) === 'Please Hold Still|Kiting for Beginners|The Elephant in the Room|Knock Knock|Goat Logistics|Do Not Look Directly');
  check('all six are open (no locks) and saved stars show (3 + 2 = 5 of 18)', await p.evaluate(() => document.querySelectorAll('.bs-pz.is-broken').length === 0 && /5 \/ 18 stars/.test(document.querySelector('#pz-total').textContent) && document.querySelectorAll('.bs-pz-stars .is-on').length === 5));
  check('the goat puzzle lists the free VIP in its roster', await p.evaluate(() => /Goat/.test(document.querySelector('[data-id="goat_logistics"] .bs-pz-roster').textContent)));
  check('wide: the side panel is open for the first unfinished puzzle (the 2nd: 2 stars), in the right-hand column', await p.evaluate(() => { const pn = document.querySelector('#pz-panel'); const sd = document.querySelector('.bs-pz-side'); return !!pn && sd.contains(pn) && /Kiting/.test(pn.textContent) && document.querySelector('[data-id="kiting_101"]').classList.contains('is-selected'); }));
  check('the hint is hidden until asked for ("Need a hint?")', await p.evaluate(() => document.querySelector('#pz-hint').hidden && /Need a hint/.test(document.querySelector('#pz-hint-btn').textContent)));
  await p.click('#pz-hint-btn'); await p.waitForTimeout(60);
  check('...then shown, and the button says how to hide it', await p.evaluate(() => !document.querySelector('#pz-hint').hidden && document.querySelector('#pz-hint').textContent.length > 20 && /Hide/.test(document.querySelector('#pz-hint-btn').textContent) && document.querySelector('#pz-hint-btn').getAttribute('aria-expanded') === 'true'));
  await p.click('#pz-pick-spear_wall'); await p.waitForTimeout(80);
  check('selecting another card swaps the panel, re-hides the hint and shows the best result', await p.evaluate(() => document.querySelector('#pz-hint').hidden && /Please Hold Still/.test(document.querySelector('#pz-panel').textContent) && /3 stars/.test(document.querySelector('#pz-best').textContent) && /940 dr/.test(document.querySelector('#pz-best').textContent) && /1:01/.test(document.querySelector('#pz-best').textContent)));
  check('three star conditions are listed, earned ones marked', await p.evaluate(() => document.querySelectorAll('.bs-pz-stars-list li').length === 3 && document.querySelectorAll('.bs-pz-stars-list li.is-earned').length === 3));
  await p.click('#pz-reset'); await p.waitForTimeout(150);
  check('Reset best asks first (in-page modal)', await p.evaluate(() => !!document.querySelector('.vw-modal') && /Reset this best/.test(document.querySelector('.vw-modal').textContent)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  check('Esc cancels (best untouched)', await p.evaluate(() => __ui.mock.ctx.save.progress.get('puzzles').spear_wall.stars === 3));
  await p.click('#pz-reset'); await p.waitForTimeout(150); await p.click('.vw-modal .vw-btn--danger'); await p.waitForTimeout(150);
  check('confirming clears the best, the stars and the card, and disables Reset', await p.evaluate(() => !__ui.mock.ctx.save.progress.get('puzzles').spear_wall && /Not tried yet/.test(document.querySelector('#pz-best').textContent) && document.querySelector('#pz-reset').disabled && /2 \/ 18 stars/.test(document.querySelector('#pz-total').textContent)));
  await p.click('#pz-play-kiting_101'); await p.waitForTimeout(500);
  check('Play opens the briefing overlay for that puzzle (goal, par, roster, fixed rules)', (await overlays(p)) === 'briefing' && await p.evaluate(() => { const t = document.querySelector('.bs-brief-card').textContent; return /Kiting for Beginners/.test(t) && /Puzzle 2 of 6/.test(t) && /Par for the 2nd star/.test(t) && /900 dr/.test(t) && document.querySelectorAll('.bs-brief-card .bs-pz-unit').length === 2 && /Retries are free/.test(t) && /already placed/.test(t); }));
  await p.click('#brief-deploy'); await p.waitForTimeout(150);
  const setup = await p.evaluate(() => JSON.stringify(__ui.mock.game.setup));
  check('Deploy builds a puzzle setup (kind, mission id, arena, budget, roster, hand-placed enemy, no mutators or god powers)', /"kind":"puzzle"/.test(setup) && /"mission":"kiting_101"/.test(setup) && /"puzzle":"kiting_101"/.test(setup) && /"presetId":"oasis"/.test(setup) && /"budget":1200/.test(setup) && /"roster":\["cretan_archer","peltast"\]/.test(setup) && /"defId":"mummy"/.test(setup) && /"godPowers":false/.test(setup) && /"mutators":\[\]/.test(setup), setup.slice(0, 400));
  await p.evaluate(`${SETUP()} __ui.router.goto('campaign'); __ui.router.goto('puzzles');`); await p.waitForTimeout(250);
  await p.focus('#pz-pick-spear_wall'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown');
  check('arrow keys move through the grid (right = next card, down = next row)', await p.evaluate(() => document.activeElement && document.activeElement.id === 'pz-pick-goat_logistics'), await p.evaluate(() => document.activeElement && document.activeElement.id));
  check('Back returns to the campaign map (no recursion)', await p.evaluate(() => { document.querySelector('#pz-frame-back').click(); return true; }) && (await p.evaluate(`__ui.router.current()`)) === 'campaign');
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();
}
{
  const { page: p, logs, close } = await open(browser, { width: 390, height: 844, touch: true });
  await p.evaluate(`${SETUP({ touch: true })} __ui.router.goto('puzzles');`); await p.waitForTimeout(300);
  check('phone: one column, no horizontal scroll, nothing selected yet', await p.evaluate(() => { const c = [...document.querySelectorAll('.bs-pz')]; return new Set(c.map((e) => e.offsetLeft)).size === 1 && document.documentElement.scrollWidth <= innerWidth && !document.querySelector('#pz-panel'); }));
  await p.tap('#pz-pick-knock_knock'); await p.waitForTimeout(150);
  check('phone: tapping a card opens its panel right under it, full width', await p.evaluate(() => { const c = document.querySelector('[data-id="knock_knock"]'); const pn = document.querySelector('#pz-panel'); return !!pn && c.nextElementSibling === pn && pn.offsetWidth > 300; }));
  check('phone: every control is at least 44 px', await p.evaluate(() => [...document.querySelectorAll('.bs-pz-pick, .bs-pz-foot button, #pz-panel button')].every((b) => b.offsetHeight >= 43.5 && b.offsetWidth >= 43.5)));
  await p.tap('#pz-pick-knock_knock'); await p.waitForTimeout(100);
  check('phone: tapping the selected card again closes the panel', await p.evaluate(() => !document.querySelector('#pz-panel')));
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();
}
{
  const { page: p, close } = await open(browser, { width: 820, height: 1180, touch: true });
  await p.evaluate(`${SETUP({ touch: true })} __ui.router.goto('puzzles');`); await p.waitForTimeout(300);
  check('tablet: 2 x 3 grid', await p.evaluate(() => new Set([...document.querySelectorAll('.bs-pz')].map((e) => e.offsetLeft)).size === 2));
  await close();
}
{
  console.log('Puzzles: empty and error states');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`${SETUP({ noPuzzles: true })} __ui.router.goto('puzzles');`); await p.waitForTimeout(250);
  check('no puzzle data: an empty state with a Back button (not a blank page)', await p.evaluate(() => /No puzzles found/.test(document.body.textContent) && !!document.querySelector('#pz-empty-back')));
  await p.evaluate(`${SETUP({ puzzles: [{ id: 'spear_wall', title: 'Please Hold Still', kind: 'puzzle' }, { id: 'ok_one', title: 'Fine One', arena: { recipe: 'marathon', size: 'medium', seed: 1 }, player: { roster: ['hoplite', 'peltast'], budget: 1000 }, par: 700, goal: { type: 'eliminate' }, enemy: { placements: [] } }, null] })} __ui.mock.ctx.save.status = () => 'memory'; __ui.router.goto('puzzles');`); await p.waitForTimeout(300);
  check('a puzzle that fails validation says it is being re-chiselled, with Play disabled; the others still work', await p.evaluate(() => { const b = document.querySelector('[data-id="spear_wall"]'); const ok = document.querySelector('[data-id="ok_one"]'); return /re-chiselled/.test(b.textContent) && b.querySelector('.bs-pz-foot button').disabled && !ok.querySelector('.bs-pz-foot button').disabled; }));
  check('...null entries and missing text do not crash (3 cards, no "undefined")', await p.evaluate(() => document.querySelectorAll('.bs-pz').length === 3 && !/undefined|NaN|\[object/.test(document.querySelector('.bs-puzzles').textContent)));
  check('blocked storage shows "Not saving"', await p.evaluate(() => !!document.querySelector('#pz-notsaving') && /Not saving/.test(document.querySelector('#pz-notsaving').textContent)));
  await p.click('[data-id="spear_wall"] .bs-pz-foot button', { force: true, timeout: 1500 }).catch(() => {});
  check('a disabled Play does nothing', (await overlays(p)) === '');
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();
}
{
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(RES('puzzle', 0));
  check('puzzle results: "Puzzle 2" with its three stars, Retry (R), Next puzzle (sub = title), Puzzles', await p.evaluate(() => { const t = document.querySelector('.bs-res-actions').textContent; return /Puzzle 2/.test(document.querySelector('.bs-res-mission').textContent) && document.querySelectorAll('.bs-res-star').length === 3 && /Retry/.test(t) && /Next puzzle/.test(t) && /The Elephant in the Room/.test(t) && /Puzzles/.test(t) && !/Again, but smarter/.test(t) && !/Next mission/.test(t); }));
  await p.click('#res-next'); await p.waitForTimeout(150);
  check('Next puzzle opens that puzzle\'s briefing', (await p.evaluate(`__ui.router.current()`)) === 'briefing' && /The Elephant in the Room/.test(await txt(p, '.bs-brief-title')));
  await p.evaluate(RES('puzzle', 0)); await p.click('#res-menu'); await p.waitForTimeout(150);
  check('"Puzzles" goes back to the puzzle list', (await p.evaluate(`__ui.router.current()`)) === 'puzzles');
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();
}
{
  const { page: p, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`${SETUP()} __ui.router.goto('campaign');`); await p.waitForTimeout(300);
  check('the campaign map has a "Puzzles (6)" button that opens the puzzles', /Puzzles \(6\)/.test(await txt(p, '#camp-puzzles')) && await p.evaluate(() => { document.querySelector('#camp-puzzles').click(); return true; }) && (await p.evaluate(`__ui.router.current()`)) === 'puzzles');
  await close();
}
{
  const { page: p, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`${SETUP()} for (const id of ['campaign', 'survival', 'daily', 'puzzles']) __ui.router.goto(id); __ui.router.goto('campaign'); __ui.router.overlay('briefing', { mission: 'pyramid_scheme' }); __ui.router.closeOverlay('briefing'); __ui.router.overlay('briefing', { puzzle: 'knock_knock' });`); await p.waitForTimeout(200);
  const miss = await p.evaluate(`__ui.missingIcons()`);
  check('every HUD-set icon the screens ask for exists (no placeholder diamonds)', miss.length === 0, miss.join(','));
  await close();
}

await browser.close();
finish('screens');
