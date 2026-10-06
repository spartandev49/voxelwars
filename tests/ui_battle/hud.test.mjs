// UI6 / UI13 / X1 / X4 (HUD half): the battle HUD against the fake Game (tests/ui_battle/mockhud.js) in headless Chromium.
//  - every HUD part exists; DOM text writes <= 10 Hz (MutationObserver) and no layout reads inside update() (instrumented, with a negative control)
//  - HUD coverage <= 25% at 1280x720; Tab hides it; layouts at 4 viewports have no horizontal scroll
//  - hotkeys + every button has a visible effect (real Playwright clicks, so a covered button fails)
//  - announcer: typewriter, chain exchange, blips, subtitle toggle (default ON); Reduce Motion
import { launch, open, check, finish, LAYOUT_PROBE } from './_lib.mjs';

const browser = await launch();
const GAME = `__ui.mock.game`;
const calls = async (p) => p.evaluate(`${GAME}.calls.map((c) => c.name + ':' + JSON.stringify(c.args)).join('|')`);
const BATTLE = (extra) => `__ui.setup(Object.assign({ seed: 5 }, ${extra || '{}'})); __ui.router.goto('battle'); __ui.mock.game.select(2); __ui.step(12);`;

async function measureCoverage(p) {
  return p.evaluate(() => {
    const W = innerWidth, H = innerHeight, S = 4, gw = Math.ceil(W / S), gh = Math.ceil(H / S), g = new Uint8Array(gw * gh);
    const els = [...document.querySelectorAll('.vw-hud .hud-panel, .vw-hud .hud-feed-row, .vw-hud .hud-sel-hint, .vw-hud .hud-mut')].filter((e) => { const cs = getComputedStyle(e); return !e.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && e.getClientRects().length; });
    for (const e of els) { const r = e.getBoundingClientRect(); for (let y = Math.max(0, Math.floor(r.top / S)); y < Math.min(gh, Math.ceil(r.bottom / S)); y++) for (let x = Math.max(0, Math.floor(r.left / S)); x < Math.min(gw, Math.ceil(r.right / S)); x++) g[y * gw + x] = 1; }
    let n = 0; for (const v of g) n += v;
    return { pct: +(100 * n / (gw * gh)).toFixed(1), n: els.length };
  });
}

// ---------------------------------------------------------------------------------------------- UI6: parts + rate + layout reads
{
  console.log('UI6: HUD parts, update rate, layout reads');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(LAYOUT_PROBE);
  await p.evaluate(BATTLE());
  const parts = await p.evaluate(() => ['army', 'timer', 'objective', 'speed', 'camera', 'killfeed', 'announcer', 'selection', 'powers', 'orders', 'minimap', 'types'].filter((k) => !document.querySelector('.vw-hud [data-hud="' + k + '"]')));
  check('all HUD parts are mounted (army meter, timer, objective, speed, camera, kill feed, announcer, selection, powers, orders, minimap, per-type counts)', parts.length === 0, parts.join(','));
  check('bubble layer pool of 12 .vw-bubble', (await p.evaluate(() => document.querySelectorAll('.vw-bubbles .vw-bubble').length)) === 12);
  check('speed controls: pause + 0.25/0.5/1/2/4', (await p.evaluate(() => [...document.querySelectorAll('.hud-spd')].map((b) => b.dataset.speed).join())) === '0.25,0.5,1,2,4');
  check('camera modes: Orbit, Follow, Command, Top-down, Cinematic, Photo', (await p.evaluate(() => [...document.querySelectorAll('.hud-cam')].map((b) => b.dataset.mode).join())) === 'orbit,follow,command,topdown,cinematic,photo');
  check('6 god powers with hotkeys 1-6', (await p.evaluate(() => [...document.querySelectorAll('.hud-powers .hud-power')].map((b) => b.querySelector('.hud-power-key').textContent).join())) === '1,2,3,4,5,6');
  check('4 orders', (await p.evaluate(() => [...document.querySelectorAll('.hud-order')].map((b) => b.dataset.order).join())) === 'advance,hold,retreat,focus');

  // probe + text-write observer, then 3.5 s of a real 60 Hz game loop
  await p.evaluate(() => {
    const hud = __ui.router.base.inst.hud; window.__lr.times = []; const u = hud.update;
    hud.update = function () { window.__lr.times.push(performance.now()); return u.apply(this, arguments); };
    __probeHud(hud);
    window.__w = new Map();
    new MutationObserver((recs) => { const t = performance.now(); for (const r of recs) { const text = r.type === 'characterData' || [...r.addedNodes, ...r.removedNodes].some((n) => n.nodeType === 3); if (!text) continue; let a = __w.get(r.target); if (!a) __w.set(r.target, a = []); a.push(t); } }).observe(document.querySelector('.vw-hud'), { subtree: true, childList: true, characterData: true });
    __ui.startLoop();
  });
  await p.waitForTimeout(3600);
  const r = await p.evaluate(() => {
    const maxWin = (ts) => { let m = 0; for (let i = 0; i < ts.length; i++) { let n = 0; for (let j = i; j < ts.length && ts[j] - ts[i] < 1000; j++) n++; if (n > m) m = n; } return m; };
    let worst = 0, worstEl = '', writes = 0;
    for (const [el, ts] of __w) { writes += ts.length; const m = maxWin(ts); if (m > worst) { worst = m; worstEl = (el.nodeType === 3 ? el.parentNode : el).className || (el.nodeType === 3 ? el.parentNode : el).tagName; } }
    return { worst, worstEl, writes, updates: maxWin(__lr.times), nUpdates: __lr.times.length, lr: __lr.count, lrNames: __lr.names };
  });
  check('HUD update() runs at most 10 times per second (' + r.nUpdates + ' updates in 3.6 s, worst 1 s window ' + r.updates + ')', r.updates <= 10 && r.nUpdates >= 15);
  check('DOM text writes per element <= 10 Hz (worst ' + r.worst + ' in 1 s on .' + r.worstEl + ', ' + r.writes + ' writes total)', r.worst <= 10 && r.writes > 20, JSON.stringify(r));
  check('no layout reads inside update() (' + r.lr + ' counted)', r.lr === 0, JSON.stringify(r.lrNames));

  // negative control: a deliberate layout read inside update() must be caught by the probe
  const nc = await p.evaluate(() => { __ui.stopLoop(); const hud = __ui.router.base.inst.hud; const m = hud.modules.timer; const u = m.update; m.update = function (h) { void document.body.offsetWidth; return u.call(this, h); }; __lr.count = 0; hud.update(__ui.mock.game.hud(), 0.1, true); const c = __lr.count; m.update = u; return c; });
  check('negative control: a layout read inside update() is detected (probe works)', nc > 0, 'count ' + nc);
  check('no console errors or warnings', logs.length === 0, logs.join(' | '));
  await close();
}

// ---------------------------------------------------------------------------------------------- 60 Hz direct caller (the manager throttles itself)
{
  const { page: p, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(LAYOUT_PROBE);
  await p.evaluate(`__ui.setup({ seed: 5 }); __ui.mountHudOnly(); __ui.mock.game.select(2); __ui.startLoop();`);
  await p.waitForTimeout(2200);
  const n = await p.evaluate(() => __ui.state.stats.updates);
  check('even when the app calls update() every frame the manager only runs modules at <= 10 Hz (' + n + ' in 2.2 s)', n <= 23 && n >= 10, n);
  await close();
}

// ---------------------------------------------------------------------------------------------- UI13: coverage + Tab
{
  console.log('UI13: HUD coverage and Tab');
  const { page: p, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(BATTLE());
  const c1 = await measureCoverage(p);
  check('HUD covers <= 25% of 1280x720 (selection shown, counts collapsed): ' + c1.pct + '%', c1.pct <= 25, JSON.stringify(c1));
  await p.evaluate(`__ui.router.base.inst.hud.modules.typecounts.toggle(); __ui.step(1);`);
  const c2 = await measureCoverage(p);
  check('...and with the per-type counts open: ' + c2.pct + '%', c2.pct <= 25, JSON.stringify(c2));
  await p.evaluate(`__ui.router.base.inst.hud.modules.typecounts.toggle(); __ui.router.base.inst.hud.modules.help.show(false);`);
  await p.keyboard.press('Tab');
  await p.waitForTimeout(80);
  const hidden = await measureCoverage(p);
  check('Tab hides the HUD (0 visible panels)', hidden.n === 0 && hidden.pct === 0, JSON.stringify(hidden));
  check('...a "HUD hidden, Tab brings it back" chip appears', await p.evaluate(() => { const c = document.querySelector('.hud-hidden-chip'); return !!c && !c.hidden; }));
  await p.keyboard.press('Tab');
  await p.waitForTimeout(80);
  check('Tab again shows it', (await measureCoverage(p)).n > 5);
  await close();
}

// ---------------------------------------------------------------------------------------------- layouts at 4 viewports
{
  console.log('UI2/UI13: viewports');
  for (const [w, h] of [[1280, 720], [1920, 1080], [820, 1180], [390, 844]]) {
    const { page: p, logs, close } = await open(browser, { width: w, height: h, touch: w < 700 });
    await p.evaluate(BATTLE(w < 700 ? '{ touch: true }' : '{}'));
    await p.evaluate(`__ui.step(14)`); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const hudEls = [...document.querySelectorAll('.vw-hud .hud-panel, .vw-hud .hud-feed-row')].filter((e) => !e.hidden && e.getClientRects().length);
      const out = hudEls.filter((e) => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1; }).map((e) => e.className.split(' ')[0]);
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, out, layout: document.querySelector('.vw-hud').dataset.layout };
    });
    check(`${w}x${h} (${r.layout}): no horizontal scroll and every HUD panel inside the viewport`, r.sw <= r.iw && r.out.length === 0, JSON.stringify(r));
    const cov = await measureCoverage(p);
    if (w === 1920) check('1920x1080 HUD coverage is modest: ' + cov.pct + '%', cov.pct <= 18);
    if (w < 700) check('phone HUD leaves most of the screen to the battle: ' + cov.pct + '%', cov.pct <= 45);
    check(`${w}x${h}: no console errors`, logs.length === 0, logs.join(' | '));
    await close();
  }
}

// ---------------------------------------------------------------------------------------------- hotkeys
{
  console.log('Hotkeys');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(BATTLE());
  const press = async (k, wait) => { await p.keyboard.press(k); await p.waitForTimeout(wait || 60); await p.evaluate(`__ui.step(0.3)`); };
  await press('Space'); check('Space pauses', (await calls(p)).includes('pause:[true]'));
  check('...and the HUD shows the PAUSED ribbon', await p.evaluate(() => { const f = document.querySelector('.hud-paused-flag'); return !!f && !f.hidden; }));
  await press('Space'); check('Space again resumes', (await calls(p)).includes('pause:[false]'));
  await press('BracketRight'); check(']  = faster (2x)', (await calls(p)).includes('setSpeed:[2]'));
  await press('BracketLeft'); await press('BracketLeft'); check('[ [ = slower (0.5x)', (await calls(p)).includes('setSpeed:[0.5]'));
  check('the active speed button follows (aria-pressed)', await p.evaluate(() => document.querySelector('.hud-spd[data-speed="0.5"]').getAttribute('aria-pressed') === 'true'));
  await press('KeyF'); check('F follows the selected unit', (await calls(p)).includes('camera.follow:[2]') && (await calls(p)).includes('camera.setMode:["follow"]'));
  await press('KeyT'); check('T = top-down', (await calls(p)).includes('camera.setMode:["topdown"]'));
  await press('KeyC'); check('C = cinematic', (await calls(p)).includes('camera.setMode:["cinematic"]'));
  await press('KeyP'); check('P = photo mode', (await calls(p)).includes('camera.setMode:["photo"]'));
  check('...photo mode hides the rest of the HUD and shows the photo bar', await p.evaluate(() => getComputedStyle(document.querySelector('.hud-top')).visibility === 'hidden' && !document.querySelector('.hud-photo').hidden));
  await press('KeyP'); check('P again leaves photo mode', (await calls(p)).includes('camera.setMode:["orbit"]'));
  await press('KeyO'); check('O = advance order for the selected squad', (await calls(p)).includes('"order":"advance","squad":3'));
  await press('KeyL'); check('L = hold order', (await calls(p)).includes('"order":"hold"'));
  await press('KeyM'); check('M folds the radar away', await p.evaluate(() => document.querySelector('.hud-mini').classList.contains('is-closed')));
  await press('KeyM'); check('M brings it back', await p.evaluate(() => !document.querySelector('.hud-mini').classList.contains('is-closed')));
  await press('KeyH'); check('H opens the controls overlay', await p.evaluate(() => !document.querySelector('.hud-help').hidden));
  check('...it lists the per-context tables (camera, control, take command) with real keys', await p.evaluate(() => { const t = document.querySelector('.hud-help').textContent; return /Battle camera/.test(t) && /Battle control/.test(t) && /Take Command/.test(t) && /Space/.test(t); }));
  await press('Escape'); check('Esc closes the overlay (and does not open the pause menu)', await p.evaluate(() => document.querySelector('.hud-help').hidden && !document.querySelector('[data-screen="pause"]')));
  await press('Enter'); check('Enter = Take Command on the selected unit', (await calls(p)).includes('possess:[2]'));

  // power keys: the Game owns aiming (game.aim); Esc cancels
  await p.evaluate(BATTLE());
  await press('Digit2'); check('2 arms god power 2 via game.aim("meteor")', (await calls(p)).includes('aim:["meteor"]') && await p.evaluate(() => document.querySelector('#hud-power-2').getAttribute('aria-pressed') === 'true'));
  check('...an aim hint appears with how to cancel', await p.evaluate(() => { const a = document.querySelector('.hud-aim'); return !a.hidden && /Esc cancels/.test(a.textContent); }));
  await press('Escape'); check('Esc cancels aiming (game.aim(null))', (await calls(p)).includes('aim:[null]') && await p.evaluate(() => document.querySelector('.hud-aim').hidden));
  // fallback when the Game has no aim(): HUD arms itself and casts on the next canvas click via groundAt
  await p.evaluate(`${BATTLE()} delete __ui.mock.game.aim; __ui.mock.game.calls.length = 0;`);
  await press('Digit1');
  await p.mouse.click(400, 300);
  await p.waitForTimeout(80);
  check('no game.aim(): next click casts at the ground point (game.cast + groundAt)', /cast:\["zeus_lightning",/.test(await calls(p)) && (await calls(p)).includes('groundAt'), await calls(p));
  // cooldown: a recharging power says so instead of arming
  await p.evaluate(`${BATTLE()} __ui.mock.game.calls.length = 0; __ui.mock.game._cd[3] = 12; __ui.step(0.5);`);
  await press('Digit4');
  check('a recharging power does not arm (toast explains)', !(await calls(p)).includes('aim:') && await p.evaluate(() => __ui.mock.calls.toasts.some((t) => /Heal Wave/.test(t) && /seconds/.test(t))));

  // rebinding: settings.keys changes both the key and the tooltip
  await p.evaluate(`__ui.setup({ seed: 5, settings: { keys: { pause: 'KeyG' } } }); __ui.router.goto('battle'); __ui.step(2);`);
  await p.keyboard.press('Space'); await p.waitForTimeout(40);
  check('rebinding: the old key no longer pauses', !(await calls(p)).includes('pause:'));
  await p.keyboard.press('KeyG'); await p.waitForTimeout(40);
  check('rebinding: the new key pauses', (await calls(p)).includes('pause:[true]'));
  check('rebinding: the tooltip shows the new key', await p.evaluate(() => /\(G\)/.test(document.querySelector('#hud-pause').dataset.tip)));
  check('no console errors during hotkeys', logs.length === 0, logs.join(' | '));
  await close();
}

// ---------------------------------------------------------------------------------------------- every button has a visible effect
{
  console.log('Buttons');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  const ids = ['hud-pause', 'hud-speed-0_25', 'hud-speed-0_5', 'hud-speed-1', 'hud-speed-2', 'hud-speed-4', 'hud-gear', 'hud-cam-orbit', 'hud-cam-follow', 'hud-cam-command', 'hud-cam-topdown', 'hud-cam-cinematic', 'hud-cam-photo',
    'hud-subtitles', 'hud-power-1', 'hud-power-2', 'hud-power-3', 'hud-power-4', 'hud-power-5', 'hud-power-6', 'hud-order-advance', 'hud-order-hold', 'hud-order-retreat', 'hud-order-focus', 'hud-mini-toggle', 'hud-sel-follow', 'hud-sel-command', 'hud-types-toggle'];
  const fp = `(() => ({ calls: __ui.mock.game.calls.length, toasts: __ui.mock.calls.toasts.length, overlays: __ui.router.overlays.length, html: document.querySelector('.vw-hud').outerHTML.length, settings: JSON.stringify(__ui.mock.ctx.settings.all()) }))()`;
  let bad = [];
  for (const id of ids) {
    await p.evaluate(`${BATTLE()} __ui.mock.game._cd[1] = 9; __ui.step(0.2);`);
    const before = await p.evaluate(fp);
    try { await p.click('#' + id, { timeout: 2500 }); } catch (e) { bad.push(id + ' (not clickable: ' + e.message.split('\n')[0] + ')'); continue; }
    await p.waitForTimeout(60); await p.evaluate(`__ui.step(0.2)`);
    const after = await p.evaluate(fp);
    if (JSON.stringify(before) === JSON.stringify(after)) bad.push(id + ' (nothing happened)');
  }
  await p.evaluate(`__ui.router.base.inst.hud.modules.typecounts.toggle();`);   // the open/closed state is remembered for the session: put it back
  check(`all ${ids.length} HUD buttons are clickable and visibly do something`, bad.length === 0, bad.join('; '));
  // buttons that only exist in a state
  await p.evaluate(`${BATTLE()} __ui.router.base.inst.hud.modules.help.show(true);`);
  await p.click('#hud-help-close'); check('help overlay: close button works', await p.evaluate(() => document.querySelector('.hud-help').hidden));
  await p.evaluate(`${BATTLE()} __ui.router.base.inst.hud.modules.powers.activate(0); __ui.step(0.2);`);
  await p.click('.hud-aim-cancel'); check('aim hint: cancel button works', await p.evaluate(() => document.querySelector('.hud-aim').hidden) && (await calls(p)).includes('aim:[null]'));
  await p.evaluate(`${BATTLE()} __ui.mock.game.possessId = 2; __ui.step(0.5);`);
  for (const n of [1, 2, 3]) { await p.click('#hud-tc-ab' + n); }
  check('Take Command: the three ability buttons send possessInput', (await calls(p)).split('possessInput').length === 4, await calls(p));
  await p.click('#hud-tc-exit'); check('Take Command: Exit releases the unit (possess(null))', (await calls(p)).includes('possess:[null]'));
  await p.evaluate(`${BATTLE()} __ui.mock.game.camMode = 'photo'; __ui.step(0.5);`);
  await p.click('#hud-photo-freeze'); check('photo: Freeze pauses', (await calls(p)).includes('pause:[true]'));
  await p.click('#hud-photo-done'); check('photo: Done returns to orbit', (await calls(p)).includes('camera.setMode:["orbit"]'));
  check('no console errors from button clicks', logs.length === 0, logs.join(' | '));
  await close();
}

// ---------------------------------------------------------------------------------------------- announcer (X4)
{
  console.log('Announcer');
  const { page: p, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('battle');`);
  check('subtitles are on by default (X4)', await p.evaluate(() => __ui.mock.ctx.settings.get('subtitles') === true && !document.querySelector('.hud-ann').classList.contains('no-subs')));
  // brutus intro at t=0.6: typewriter in 4-char steps at 10 Hz, ui_tick blips
  await p.evaluate(`__ui.step(1.0); __ui.mock.calls.audio.length = 0;`);
  const samples = [];                                                                                      // [chars shown, page clock ms]; sampled with the page clock so a busy machine cannot fake a failure
  for (let i = 0; i < 8; i++) { samples.push(await p.evaluate(() => [document.querySelector('.hud-ann-text .shown').textContent.length, performance.now()])); await p.waitForTimeout(100); }
  const steps = samples.slice(1).map((v, i) => ({ d: v[0] - samples[i][0], dt: v[1] - samples[i][1] })).filter((x) => x.d > 0);   // a line that ends and restarts shows as a drop: ignored
  const rate = steps.reduce((t, x) => t + x.d, 0) / (steps.reduce((t, x) => t + x.dt, 0) / 1000);
  check('typewriter reveals text in 4-char chunks, at most one step per 105 ms (' + rate.toFixed(0) + ' chars/s)', steps.length >= 3 && steps.filter((x) => x.d === 4).length >= 3 && steps.every((x) => x.d <= 4 * (Math.floor(x.dt / 100) + 1)) && rate > 15 && rate <= 4 * 10 * 1.05, samples.map((x) => x[0]).join(','));
  check('typewriter plays ui_tick blips', (await p.evaluate(() => __ui.mock.calls.audio.filter((c) => c === 'ui_tick').length)) >= 2);
  check('the portrait is Brutus with the talking animation on', await p.evaluate(() => { const a = document.querySelector('.hud-ann'); return a.dataset.who === 'brutus' && a.classList.contains('is-talking') && /BRUTUS/i.test(a.querySelector('.hud-ann-name').textContent); }));
  // skip: click the text finishes it
  await p.click('.hud-ann-text'); await p.waitForTimeout(150);
  check('clicking the text skips the typing', await p.evaluate(() => document.querySelector('.hud-ann-text .ghost').textContent === ''));
  // subtitle toggle
  await p.click('#hud-subtitles'); await p.waitForTimeout(80);
  check('subtitle button turns subtitles off (setting + class + notice)', await p.evaluate(() => __ui.mock.ctx.settings.get('subtitles') === false && document.querySelector('.hud-ann').classList.contains('no-subs') && /Subtitles off/.test(document.querySelector('.hud-ann-off').textContent) && !document.querySelector('.hud-ann-off').hidden));
  check('...and the text is not shown', await p.evaluate(() => getComputedStyle(document.querySelector('.hud-ann-text .shown')).display === 'none'));
  await p.click('#hud-subtitles'); await p.waitForTimeout(80);
  check('toggling back shows the line again', await p.evaluate(() => document.querySelector('.hud-ann-text .shown').textContent.length > 5));
  // chain exchange: Brutus -> Plato -> Cassandra at t=13
  await p.evaluate(`__ui.mock.game.battle.annIdx = 2; __ui.step(13.5);`);
  const who = [];
  for (let i = 0; i < 140; i++) { const w = await p.evaluate(() => document.querySelector('.hud-ann').dataset.who + '|' + document.querySelector('.hud-ann-text .ghost').textContent.length); const k = w.split('|')[0]; if (who[who.length - 1] !== k) who.push(k); await p.waitForTimeout(150); }
  check('chain exchange plays Brutus, Plato, Cassandra in order (' + who.join('>') + ')', /brutus.*plato.*cassandra/.test(who.join('>')));
  await close();
}

// ---------------------------------------------------------------------------------------------- Reduce Motion (X1)
{
  console.log('Reduce Motion');
  const { page: p, logs, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`__ui.setup({ seed: 5, settings: { reduceMotion: true } }); document.documentElement.classList.add('vw-reduce-motion'); __ui.router.goto('battle'); __ui.mock.game.select(2); __ui.step(14);`);
  const r = await p.evaluate(() => {
    const hudAnims = document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.vw-hud') && a.playState === 'running');
    const ready = document.querySelector('.hud-power.is-ready');
    const cs = ready ? getComputedStyle(ready, '::before') : null;
    const js = hudAnims.filter((a) => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition));
    const moving = js.filter((a) => a.effect.getKeyframes().some((k) => ['transform', 'translate', 'scale', 'rotate'].some((p) => p in k)));
    return { rm: document.querySelector('.vw-hud').classList.contains('rm'), js: js.length, moving: moving.length, dur: cs ? cs.animationDuration : null };
  });
  check('Reduce Motion: HUD root carries .rm', r.rm);
  check('Reduce Motion: no JS (WAAPI) tween moves anything (only short opacity fades remain: ' + r.js + ')', r.moving === 0, r.moving);
  check('Reduce Motion: CSS animations collapse (ready glow duration ' + r.dur + ')', r.dur === '0.001ms' || r.dur === '1e-06s', r.dur);
  await p.evaluate(`__ui.mock.game.fight(); __ui.step(3.2); __ui.step(0.3);`);
  await p.waitForTimeout(100);
  check('Reduce Motion: the FIGHT! beat has no shockwave / wobble animation', await p.evaluate(() => { const ring = document.querySelector('.bs-cd-ring'); return !ring || ring.getAnimations().length === 0; }));
  // same setup with motion allowed has the glow animation (control)
  await p.evaluate(`document.documentElement.classList.remove('vw-reduce-motion'); __ui.setup({ seed: 5 }); __ui.router.goto('battle'); __ui.step(14);`);
  check('control: with motion on the ready glow animates (1.6 s)', await p.evaluate(() => { const ready = document.querySelector('.hud-power.is-ready'); return !!ready && getComputedStyle(ready, '::before').animationDuration === '1.6s'; }));
  check('no console errors', logs.length === 0, logs.join(' | '));
  await close();
}

// ---------------------------------------------------------------------------------------------- colour-blind palette awareness
{
  const { page: p, close } = await open(browser, { width: 1280, height: 720 });
  await p.evaluate(`__ui.setup({ seed: 5, settings: { palette: 'cvd' } }); __ui.router.goto('battle'); __ui.step(5);`);
  const cv = await p.evaluate(() => ({ a: getComputedStyle(document.querySelector('.vw-hud')).getPropertyValue('--team-a').trim(), b: getComputedStyle(document.querySelector('.vw-hud')).getPropertyValue('--team-b').trim() }));
  check('colour-blind palette sets the HUD team colours from render/style.js (blue vs orange)', cv.a === '#1b8cff' && cv.b === '#ffa31a', JSON.stringify(cv));
  await p.evaluate(`__ui.mock.ctx.settings.set('palette', 'classic');`);
  const cl = await p.evaluate(() => getComputedStyle(document.querySelector('.vw-hud')).getPropertyValue('--team-a').trim());
  check('changing the palette setting updates the HUD live', cl === '#2f6bff', cl);
  await close();
}

await browser.close();
finish('hud');
