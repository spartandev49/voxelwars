// Arena thumbnails: ctx.content.arenaThumb(id) is a Promise<dataURL> in the real app. No screen (UI-A or UI-B) may put the raw return value into img.src
// (that requests "/[object Promise]"); a placeholder stays visible until it resolves, then the image shows. Registers EVERY screen module.
import { ensureFonts, writeRegistryEntry, bundle, pageHtml, launch } from '../../tools/shot_ui.mjs';
import { check, finish } from './lib.mjs';

const fonts = ensureFonts();
const html = pageHtml(await bundle(writeRegistryEntry(true)), fonts);
const L = await launch(html, fonts, [1280, 720]);
await L.p.goto('https://t/');
await L.p.waitForFunction(() => !!window.__ui);
const state = (sel) => L.p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; return { hasSrc: !!e.getAttribute('src'), kind: (e.getAttribute('src') || '').slice(0, 11), w: e.naturalWidth, shown: getComputedStyle(e).display !== 'none' }; }, sel);
const phShown = () => L.p.evaluate(() => Array.from(document.querySelectorAll('.vw-thumb-ph, .vw-qb__thumb-fallback, .vw-qb__mini-fb, div.vw-cx__athumb')).some((e) => getComputedStyle(e).display !== 'none'));

for (const [screen, params, img] of [['quick', null, '.vw-qb__thumb-img'], ['survival', null, '.bs-surv-thumb'], ['daily', null, '.bs-daily-thumb'], ['codex', { tab: 'arenas' }, '.vw-cx__athumb']]) {
  const has = await L.p.evaluate((s) => !!window.__ui.registry[s], screen);
  if (!has) { console.log('  skip ' + screen + ' (not registered)'); continue; }
  // hold every thumbnail promise open so the pending state is observable, then release it
  await L.p.evaluate(() => { const c = window.__ui.app.content; if (!c.__orig) c.__orig = c.arenaThumb; window.__gate = new Promise((r) => { window.__release = r; }); c.arenaThumb = (id) => window.__gate.then(() => c.__orig(id)); });
  await L.p.evaluate(([s, p]) => window.__ui.goto(s, p || undefined), [screen, params]);
  await L.p.waitForTimeout(150);
  const early = await state(img);
  if (early) check(`${screen}: while the thumbnail promise is pending the <img> has no src and is hidden, placeholder visible`, !early.hasSrc && !early.shown && await phShown(), JSON.stringify(early));
  await L.p.evaluate(() => window.__release());
  await L.p.waitForTimeout(500);
  const late = await state(img);
  check(`${screen}: thumbnail resolves to a data: URL and renders`, !!late && late.kind === 'data:image/' && late.w > 0 && late.shown, JSON.stringify(late));
  const bad = await L.p.evaluate(() => Array.from(document.images).filter((i) => /\[object|undefined|null$/.test(i.getAttribute('src') || '')).length);
  check(`${screen}: no <img> has a bogus src ([object Promise] / undefined)`, bad === 0, String(bad));
}
check('no console errors or warnings', L.logs.length === 0, L.logs.slice(0, 4).join(' | '));
await L.b.close();
finish('thumbs');
