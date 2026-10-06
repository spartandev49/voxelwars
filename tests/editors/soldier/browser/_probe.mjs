export async function run({ page, shot, step, check, sleep }) {
  await page.evaluate(() => window.__vw.goto('workshop'));
  await page.waitForSelector('#ws-stage canvas', { timeout: 20000 });
  await sleep(800);
  const r = await page.evaluate(() => {
    const c = document.querySelector('.ws-part canvas'); const cs = getComputedStyle(c); const p = c.parentElement.getBoundingClientRect();
    const t = document.querySelector('.ws-part').getBoundingClientRect();
    return { w: cs.width, h: cs.height, cls: c.className, cw: c.width, parent: [p.width, p.height], tile: [t.width, t.height] };
  });
  console.log(JSON.stringify(r));
}
