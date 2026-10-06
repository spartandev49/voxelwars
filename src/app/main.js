// VOXELWARS entry point. Boot order: capability check -> store/settings -> engine -> content/audio -> game/input/loop -> router -> splash.
import { checkCapabilities, showFatal, safeMode } from './boot.js';
import { Diagnostics } from './diagnostics.js';
import { Store, Settings, Collection, DEFAULT_SETTINGS } from '../save/store.js';
import { EventBus } from '../core/events.js';
import { buildContent } from '../content/era_ancient/content.js';
import { Engine } from '../render/engine.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { Loop } from './loop.js';
import { Router } from './router.js';
import { FALLBACK_SCREENS } from './debugui.js';
import { createNullAudio } from './nullaudio.js';
import { BLUEPRINTS, AUDIO, ANIM_BOOT, ARMYGEN, KIT, CAMPAIGN, CUSTOM } from '../_generated/registry.optional.js';
import { generateArena } from '../world/gen.js';
import { ClipLib } from '../anim/clips.js';
import { PreviewService } from '../render/preview.js';

const diag = new Diagnostics();

async function start() {
  const root = document.getElementById('vw-root') || document.body;
  const caps = checkCapabilities(); diag.caps = caps;
  if (!caps.ok) { showFatal(caps.problems.join(' '), { problems: caps.problems, caps: caps.info }); return; }
  const store = new Store();
  const settings = new Settings(store);
  if (safeMode()) { settings.data.quality = 'potato'; settings.data.autoScale = true; settings.data.resScale = 0.75; }
  const bus = new EventBus();

  // stage (canvas) + ui layers
  const stage = document.createElement('div'); stage.id = 'vw-stage'; stage.style.cssText = 'position:absolute;inset:0;overflow:hidden;background:#101428';
  const ui = document.createElement('div'); ui.id = 'vw-ui'; ui.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none';
  root.append(stage, ui);

  let engine;
  try { engine = new Engine(stage); engine.setQuality(settings.get('quality') || 'marble'); }
  catch (e) { showFatal('The 3D engine failed to start: ' + (e && e.message), { error: String(e && e.stack || e), caps: caps.info }); return; }

  // content + optional integrations
  const content = buildContent();
  if (BLUEPRINTS && BLUEPRINTS.compileSoldier) content.setCompiler(BLUEPRINTS.compileSoldier);
  if (CAMPAIGN) content.campaign = CAMPAIGN.CAMPAIGN || CAMPAIGN.campaign || content.campaign;
  if (CAMPAIGN && CAMPAIGN.campaignApi) content.campaignApi = CAMPAIGN.campaignApi;
  if (CUSTOM && CUSTOM.customDef) content.customDef = CUSTOM.customDef;
  try { if (ANIM_BOOT && ANIM_BOOT.registerAllClips) { const r = ANIM_BOOT.registerAllClips(ClipLib, { humanoid: window.__VW_UAL_CLIPS__ || null, onReport: (m) => diag.note(m) }); diag.extra.clips = r; } } catch (e) { diag.error('anim', e && e.message); }
  const audio = (AUDIO && AUDIO.createAudio) ? AUDIO.createAudio({ settings, getListener: () => game.rig.listener, quality: () => engine.qualityKey }) : createNullAudio();

  const game = new Game({ engine, content, settings, audio, bus });
  const loop = new Loop({ game, engine, settings });
  const collections = { arenas: new Collection(store, 'arenas', 48), soldiers: new Collection(store, 'soldiers', 24), armies: new Collection(store, 'armies', 24) };

  const app = { engine, game, loop, store, settings, audio, diag, content, bus, router: null };
  const ctx = {
    nav: null, settings, game, audio, content, diag: { snapshot: () => diag.snapshot(app), log: diag.log, error: (k, m) => diag.error(k, m) },
    save: { arenas: collections.arenas, soldiers: collections.soldiers, armies: collections.armies, status: () => store.status(), store },
    preview: lazyPreview(() => new PreviewService({ modelFor: (d, u) => content.modelFor(d, u), animator: game.animator, defs: content.defs, palette: () => settings.get('palette') || 'classic', compile: BLUEPRINTS && BLUEPRINTS.compileSoldier })), platform: platformApi(), version: { build: typeof __VW_VERSION__ !== 'undefined' ? __VW_VERSION__ : 'dev', date: typeof __VW_BUILD__ !== 'undefined' ? __VW_BUILD__ : '' },
  };
  content.arenaThumb = arenaThumbQueue(content, ctx.preview);
  const router = new Router(ui, () => ctx, FALLBACK_SCREENS);
  app.router = router;
  ctx.nav = { goto: (id, p) => router.goto(id, p), back: () => router.back(), current: () => router.current(), overlay: (id, p) => router.overlay(id, p), closeOverlay: (id) => router.closeOverlay(id), modal: (o) => router.modal(o), toast: (t, o) => router.toast(t, o) };

  // input
  const input = new Input({ canvas: engine.renderer.domElement, game, settings, nav: ctx.nav });
  input.attach();
  input.on('escape', () => { if (game.state === 'running') { if (!router.hasOverlay('pause')) { game.pause(true); if (!router.overlay('pause')) { /* fallback pause UI is the HUD button */ } } else { router.closeOverlay('pause'); game.pause(false); } } else router.back(); });
  input.on('rematch', () => { router.closeOverlay('results'); game.rematch(); });
  input.on('tweak', () => { router.closeOverlay('results'); game.tweak(); });
  input.on('key', (e) => router.key(e));
  loop.onFrame = (dt) => { input.update(dt); };

  // flow glue: game state -> screens
  game.on('placement', () => { if (router.current() !== 'placement' && game.state === 'placement') router.goto('placement'); });
  game.on('state', (p) => {
    if (p.state === 'countdown') { if (router.current() !== 'battle') router.goto('battle'); if (router.has('countdown')) router.overlay('countdown'); }
    else if (p.state === 'running') { router.closeOverlay('countdown'); }
  });
  game.on('battle_end', () => { setTimeout(() => { if (game.state === 'ended') router.overlay('results'); }, 1800); });
  game.on('toast', (t) => router.toast(t.text, t));
  game.on('pause', (p) => { if (!p.paused) router.closeOverlay('pause'); });
  settings.on((k, v) => {
    if (k === 'quality') { engine.setQuality(v); game.setTier(v); }
    else if (k === 'gore') game.view.gore = v; else if (k === 'corpses') game.view.corpseMode = v;
    else if (k === 'palette') game.view.setPalette(v);
    else if (k === 'reduceMotion') { game.rig.reduceMotion = !!v; document.documentElement.classList.toggle('vw-reduce-motion', !!v); }
    else if (k === 'shake') game.rig.shakeAmp = v; else if (k === 'uiScale') document.documentElement.style.fontSize = (16 * v) + 'px';
    else if (k.startsWith('vol') && audio.setVolume) { for (const b of Object.keys(settings.get('vol'))) audio.setVolume(b, settings.get('vol.' + b)); } else if (k === 'muted' && audio.setMuted) audio.setMuted(v);
  });
  game.rig.reduceMotion = !!settings.get('reduceMotion'); game.rig.shakeAmp = settings.get('shake') ?? 1;
  document.documentElement.style.fontSize = (16 * (settings.get('uiScale') || 1)) + 'px';
  if (settings.get('reduceMotion')) document.documentElement.classList.add('vw-reduce-motion');
  window.addEventListener('resize', () => engine.resize());

  // title diorama: a small live battle plays behind the menu
  startDiorama(game, content);

  // test hook (always installed; data + loop control only)
  installHook(app, input);

  // start
  const boot = document.getElementById('vw-boot'); if (boot) boot.remove();
  loop.start();
  router.goto('splash');
  diag.markTitle();
  if (audio.attach) audio.attach(null);
  document.body.dataset.vwReady = '1';
}

/** Arena thumbnails for the carousels: generated one at a time in idle slices (a terrain mesh build is ~50-150 ms), cached by preset id. Returns a Promise<dataURL|''>. */
function arenaThumbQueue(content, preview) {
  const cache = new Map(), queue = []; let busy = false;
  const pump = () => {
    if (busy || !queue.length) return; busy = true;
    const job = queue.shift();
    const run = () => {
      let url = '';
      try { const p = content.arenas.find((a) => a.id === job.id); if (p) { const arena = generateArena(p.recipe === 'random' ? 'marathon' : p.recipe, 'small', p.seed || 1); url = preview.arenaThumb(arena, 'preset:' + p.id, 192, 108) || ''; } } catch (e) { url = ''; }
      job.resolve(url); busy = false; setTimeout(pump, 16);
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 400 }); else setTimeout(run, 24);
  };
  return (id) => { if (cache.has(id)) return cache.get(id); const pr = new Promise((resolve) => { queue.push({ id, resolve }); pump(); }); cache.set(id, pr); return pr; };
}

/** The preview service owns a second WebGL context: create it on first use. */
function lazyPreview(make) {
  let svc = null; const get = () => (svc || (svc = make()));
  return { turntable: (c, s) => get().turntable(c, s), arena: (canvas, arena, o) => { const url = get().arenaThumb(arena, o && o.key, o && o.w, o && o.h); if (canvas && url) { const im = new Image(); im.onload = () => { const g = canvas.getContext('2d'); g.drawImage(im, 0, 0, canvas.width, canvas.height); }; im.src = url; } return url; }, arenaThumb: (a, k, w, h) => get().arenaThumb(a, k, w, h) };
}

function platformApi() {
  return {
    downloads: null,
    clipboard: async (text) => { try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; } },
    pickFile: (accept) => new Promise((resolve) => { const i = document.createElement('input'); i.type = 'file'; if (accept) i.accept = accept; i.onchange = () => resolve(i.files && i.files[0] || null); i.click(); }),
    isTouch: matchMedia('(pointer: coarse)').matches, viewport: () => ({ w: innerWidth, h: innerHeight }), isPhone: () => Math.min(innerWidth, innerHeight) < 600,
  };
}

/** A tiny scripted battle behind the title screen so the menu is alive. */
function startDiorama(game, content) {
  game.diorama = async () => {
    const s = game.newSetup('quick', { arena: { presetId: 'marathon', size: 'small', seed: 11 }, rules: { budget: 3000 } });
    await game.begin(s); game.autoFill(0, {}); game.autoFill(1, {});
    game.rig.setMode('orbit'); game.rig.yaw = -0.6; game.rig.pitch = 0.5; game.rig.frame(0, 0, 36);
  };
}

function installHook(app, input) {
  const hook = window.__vw = window.__vw || {};
  // live accessors must be defined, not Object.assign'ed (assign would copy the getter's value at install time)
  Object.defineProperties(hook, {
    game: { get: () => app.game, configurable: true }, world: { get: () => app.game.world, configurable: true },
    engine: { get: () => app.engine, configurable: true }, state: { get: () => app.game.state, configurable: true },
  });
  Object.assign(hook, {
    app,
    clock: { now: () => performance.now() }, metrics: () => app.diag.snapshot(app),
    step(n = 1) { const w = app.game.world; if (w) w.step(n); app.game.view.update(1, 0.0, app.engine.camera); app.engine.render(0.0); return w ? w.tickN : 0; },
    goto(id, p) { return app.router.goto(id, p); }, audio: app.audio,
    seed(s) { if (app.game.rng) app.game.rng = new (app.game.rng.constructor)(s); },
    async quick(opts = {}) { const g = app.game; const s = g.newSetup('quick', opts); await g.begin(s); g.autoFill(0, {}); g.autoFill(1, {}); app.router.goto('placement'); return g.state; },
    fight() { app.game.fight(); }, version: typeof __VW_VERSION__ !== 'undefined' ? __VW_VERSION__ : 'dev',
  });
}

// ---- entry: wait for the loader's CDN promise (three), then start ----
const ready = window.__vwReady || Promise.resolve({});
ready.then(() => start()).catch((e) => { console.error(e); showFatal('Startup failed: ' + (e && e.message), { error: String(e && e.stack || e) }); });
