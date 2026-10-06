import { noAuto, openWorkshop, wsState } from './_util.mjs';
export async function run({ page, shot, step, check, sleep }) {
  const t0 = Date.now(); const T = (m) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', m);
  await noAuto(page); await openWorkshop(page); T('opened');
  const fps = () => page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 > 3000) res(n / 3); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
  T('fps with stage ' + (await fps()).toFixed(1));
  await page.evaluate(() => { window.__ws.stage.canvas.style.display = 'none'; window.__ws.stage.alive = false; }); T('fps stage off ' + (await fps()).toFixed(1));
  const r = await page.evaluate(() => { const t = performance.now(); window.__ws.flush(); return performance.now() - t; }); T('refresh ms ' + r.toFixed(1));
  const r2 = await page.evaluate(() => { const t = performance.now(); for (let i = 0; i < 10; i++) window.__ws.doc.setHeight(1 + i * 0.01); window.__ws.flush(); return performance.now() - t; }); T('10 edits + flush ms ' + r2.toFixed(1));
}
