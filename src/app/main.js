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
import { BLUEPRINTS, AUDIO, ANIM_BOOT, ARMYGEN, KIT, CAMPAIGN, CUSTOM, EDITOR_HOST, SURVIVAL, PUZZLES, DAILY } from '../_generated/registry.optional.js';
import { generateArena } from '../world/gen.js';
import { ClipLib } from '../anim/clips.js';
import { PreviewService } from '../render/preview.js';
import { createMeta, watchQuota } from './meta.js';
import { createDocs, createDraft } from '../save/docs.js';
import { LifetimeStats, storeAdapter } from '../save/stats.js';
import { createTransfer } from '../save/transfer.js';

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
  if (PUZZLES) content.puzzles = PUZZLES.PUZZLES || PUZZLES.puzzles || PUZZLES.default || content.puzzles || [];
  if (PUZZLES && PUZZLES.puzzleApi) content.puzzleApi = PUZZLES.puzzleApi;
  if (SURVIVAL) content.survival = SURVIVAL;
  if (DAILY) content.daily = DAILY;
  try { if (ANIM_BOOT && ANIM_BOOT.registerAllClips) { const r = ANIM_BOOT.registerAllClips(ClipLib, { humanoid: window.__VW_UAL_CLIPS__ || null, onReport: (m) => diag.note(m) }); diag.extra.clips = r; } } catch (e) { diag.error('anim', e && e.message); }
  const audio = (AUDIO && AUDIO.createAudio) ? AUDIO.createAudio({ settings, getListener: () => game.rig.listener, quality: () => engine.qualityKey }) : createNullAudio();

  const game = new Game({ engine, content, settings, audio, bus });
  const loop = new Loop({ game, engine, settings });
  const collections = { arenas: new Collection(store, 'arenas', 48), soldiers: new Collection(store, 'soldiers', 24), armies: new Collection(store, 'armies', 24) };
  if (CUSTOM && CUSTOM.bindContent) CUSTOM.bindContent(content, collections.soldiers);   // saved custom soldiers resolve by id (Game.placeAt, World.addUnit) and get their own models (content/era_ancient/custom.js)

  // meta layer: progress documents (vw.progress / survival / daily / seen), lifetime stats (vw.stats), achievements, announcer, kill feed, aim / Take Command / teaching / kill-cam
  const stats = new LifetimeStats({ adapter: storeAdapter(store) });
  const docs = createDocs(store, { onResetProgress: () => stats.reset() }); docs.loadAll();
  const meta = createMeta({ game, content, settings, store, audio, docs, stats });
  game.meta = meta;
  const transfer = createTransfer({ store, docs, stats, settings, collections, defs: content.defs, build: typeof __VW_VERSION__ !== 'undefined' ? __VW_VERSION__ : 'dev' });
  const drafts = {}; const draft = (editor) => drafts[editor] || (drafts[editor] = createDraft(store, editor));
  // explicit saves count for the Landscaper / Soldier Smith medals (the editors only call collection.put)
  for (const [name, kind] of [['arenas', 'arena_saved'], ['soldiers', 'soldier_saved']]) { const put = collections[name].put.bind(collections[name]); collections[name].put = (item) => { const r = put(item); try { meta.ui(kind); } catch (e) { /* medals never block a save */ } return r; }; }
  window.addEventListener('pagehide', () => { try { stats.flush(); docs.flush(); settings.flush(); } catch (e) { /* closing */ } });

  const app = { engine, game, loop, store, settings, audio, diag, content, bus, meta, docs, stats, router: null };
  const ctx = {
    nav: null, settings, game, audio, content, diag: { snapshot: () => diag.snapshot(app), log: diag.log, error: (k, m) => diag.error(k, m) },
    save: {
      arenas: collections.arenas, soldiers: collections.soldiers, armies: collections.armies, status: () => store.status(), store,
      progress: docs.progress, survival: docs.survival, daily: docs.daily, seen: docs.seen, stats, draft,
      exportAll: () => transfer.exportAll(),
      // resolves {ok:true, errors:[], warnings, applied, counts}; REJECTS with an Error (message = the first plain-English reason, .result = the full {ok:false, errors[]}) because
      // ui/screens/settings.js treats a resolved promise as success (docs/requests/meta_import_contract.md). Nothing is applied on failure.
      importAll: async (fileOrText) => {
        const r = await transfer.importAll(fileOrText);
        if (!r.ok) { const e = new Error(r.errors[0] || 'The import failed'); e.result = r; throw e; }
        try { meta.achievements.recheck(); } catch (e) { /* medals are best effort */ }
        return r;
      },
    },
    preview: lazyPreview(() => new PreviewService({ modelFor: (d, u) => content.modelFor(d, u), animator: game.animator, defs: content.defs, palette: () => settings.get('palette') || 'classic', compile: BLUEPRINTS && BLUEPRINTS.compileSoldier })), platform: platformApi(), version: { build: typeof __VW_VERSION__ !== 'undefined' ? __VW_VERSION__ : 'dev', date: typeof __VW_BUILD__ !== 'undefined' ? __VW_BUILD__ : '' },
  };
  content.arenaThumb = arenaThumbQueue(content, ctx.preview);
  if (EDITOR_HOST && EDITOR_HOST.createEditorHost) ctx.editorHost = EDITOR_HOST.createEditorHost({ engine, game, settings });   // the 3D host the editors share (app/editorhost.js)
  const router = new Router(ui, () => ctx, FALLBACK_SCREENS);
  app.router = router;
  ctx.nav = { goto: (id, p) => router.goto(id, p), back: () => router.back(), current: () => router.current(), overlay: (id, p) => router.overlay(id, p), closeOverlay: (id) => router.closeOverlay(id), modal: (o) => router.modal(o), toast: (t, o) => router.toast(t, o) };

  // storage quota: a refused write is kept in memory (nothing lost) and one modal offers export / delete-oldest (verification P2)
  watchQuota({ store, nav: { modal: (o) => ctx.nav.modal(o), toast: (t, o) => ctx.nav.toast(t, o) }, transfer, collections, platform: ctx.platform });

  // input
  const input = new Input({ canvas: engine.renderer.domElement, game, settings, nav: ctx.nav });
  input.attach();
  let swallowEsc = false;                                         // set while a right-click cancels god-power aiming (see below)
  input.on('escape', () => { if (swallowEsc) return; if (game.killcamActive()) game.killcamStop(); else if (meta.aim.active) { meta.aim.cancel(); return; } if (game.state === 'running') { if (!router.hasOverlay('pause')) { game.pause(true); if (!router.overlay('pause')) { /* fallback pause UI is the HUD button */ } } else { router.closeOverlay('pause'); game.pause(false); } } else router.back(); });
  input.on('rematch', () => { router.closeOverlay('results'); game.rematch(); });
  input.on('tweak', () => { router.closeOverlay('results'); game.tweak(); });
  input.on('key', (e) => router.key(e));
  input.on('killcam', () => { if (game.state === 'ended' && !game.killcamActive()) game.killcam(); });
  // a right-click (a click, not an orbit drag) cancels god-power aiming; the HUD's armed state follows through its own Esc handler (ui/screens/battle.js -> powers.cancel)
  { const cv = engine.renderer.domElement; let rc = null;
    cv.addEventListener('pointerdown', (e) => { rc = e.button === 2 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; });
    cv.addEventListener('pointerup', (e) => {
      if (e.button !== 2 || !rc) return; const click = Math.hypot(e.clientX - rc.x, e.clientY - rc.y) <= 6 && performance.now() - rc.t <= 450; rc = null;
      if (click && meta.aim.active) { meta.aim.cancel(); swallowEsc = true; try { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true })); } finally { swallowEsc = false; } }
    }); }
  loop.onFrame = (dt) => { input.update(dt); };

  // flow glue: game state -> screens
  game.on('placement', () => { if (router.current() !== 'placement' && game.state === 'placement' && !game.inIntermission()) router.goto('placement'); });
  game.on('intermission', (sv) => { if (router.current() !== 'battle') router.goto('battle'); router.closeOverlay('survival'); router.overlay('survival', { view: 'intermission', survival: sv }); });
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
    else if (k === 'reduceMotion') { game.rig.reduceMotion = !!v; game.view.hitStop = v ? 0 : 1; document.documentElement.classList.toggle('vw-reduce-motion', !!v); }
    else if (k === 'shake') game.rig.shakeAmp = v; else if (k === 'uiScale') document.documentElement.style.fontSize = (16 * v) + 'px';
    else if (k.startsWith('vol') && audio.setVolume) { for (const b of Object.keys(settings.get('vol'))) audio.setVolume(b, settings.get('vol.' + b)); } else if (k === 'muted' && audio.setMuted) audio.setMuted(v);
  });
  game.setTier(settings.get('quality') || 'marble');   // lod distances, near budget, fx caps, prop tier for the saved quality
  game.rig.reduceMotion = !!settings.get('reduceMotion'); game.rig.shakeAmp = settings.get('shake') ?? 1;
  document.documentElement.style.fontSize = (16 * (settings.get('uiScale') || 1)) + 'px';
  if (settings.get('reduceMotion')) document.documentElement.classList.add('vw-reduce-motion');
  window.addEventListener('resize', () => { engine.resize(); game.onResize(); });
  // WebGL context loss (driver reset, tab memory pressure): pause, tell the player, and resume when the browser restores the context (three re-uploads its resources)
  const glc = engine.renderer.domElement;
  glc.addEventListener('webglcontextlost', (e) => { e.preventDefault(); loop.stop(); diag.error('webgl', 'context lost'); router.toast('The graphics card hiccuped. Waiting for it to come back...', { kind: 'error' }); });
  glc.addEventListener('webglcontextrestored', () => { engine.resize(); game.onResize(); loop.start(); router.toast('Graphics are back. Carry on.', { kind: 'success' }); });

  // the base screen decides what the 3D canvas does: live diorama behind the title, nothing behind opaque menus, the scene in battle/editors
  router.onChange((id) => {
    const mod = router._mod(id), meta = (mod && mod.meta) || {};
    game.setCanvasMode(meta.canvas || 'scene');
    if ((meta.music === 'menu' || meta.music === 'editor') && audio.music && audio.music.setMood) { try { audio.music.setMood(meta.music, {}); } catch (e) { /* audio is optional */ } }
  });

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

/**
 * save(filename, data: string | Blob) -> Promise<boolean>. In the hosted Artifact the page may not start downloads itself: the viewer's `downloads` capability shows a
 * confirmation and saves the file (declared at publish). In a plain browser tab (dist/voxelwars.html) an anchor download does the same job.
 * Resolves false when the viewer declines; rejects only for real failures (callers fall back to showing the text to copy).
 */
function downloadsApi() {
  const hosted = !!(window.claude && typeof window.claude.use === 'function');
  let cap = null;
  const capability = () => (cap || (cap = Promise.resolve(window.claude.use('downloads')).catch(() => null)));
  return {
    hosted,
    async save(filename, data) {
      if (hosted) {
        // the viewer only saves an allowlisted extension: share files (.vwarena, .vwsoldier) travel as plain text
        if (!/\.(gif|png|jpe?g|webp|mp4|webm|txt|json|md|csv|html|svg|pdf|zip)$/i.test(filename)) filename += '.txt';
        const d = await capability();
        if (!d) throw new Error('downloads are not available here');
        try { await d.save({ filename, data }); return true; }
        catch (e) { if (e && e.code === 'declined') return false; throw e; }
      }
      const blob = data instanceof Blob ? data : new Blob([String(data)], { type: 'text/plain' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = filename; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    },
  };
}

function platformApi() {
  return {
    downloads: downloadsApi(),
    clipboard: async (text) => { try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; } },
    pickFile: (accept) => new Promise((resolve) => { const i = document.createElement('input'); i.type = 'file'; if (accept) i.accept = accept; i.onchange = () => resolve(i.files && i.files[0] || null); i.click(); }),
    isTouch: matchMedia('(pointer: coarse)').matches, viewport: () => ({ w: innerWidth, h: innerHeight }), isPhone: () => Math.min(innerWidth, innerHeight) < 600,
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
  if (app.audio && app.audio.installTestHook) { try { app.audio.installTestHook(hook); } catch (e) { /* the hook is for tests only */ } }
}

// ---- entry: wait for the loader's CDN promise (three), then start ----
const ready = window.__vwReady || Promise.resolve({});
ready.then(() => start()).catch((e) => { console.error(e); showFatal('Startup failed: ' + (e && e.message), { error: String(e && e.stack || e) }); });
