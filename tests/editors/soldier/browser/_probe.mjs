export async function run({ page, shot, step, check, sleep }) {
  await page.evaluate(() => window.__vw.goto('workshop'));
  await page.waitForSelector('#ws-stage canvas', { timeout: 20000 });
  await sleep(800);
  const r = await page.evaluate(() => { const o = {}; for (const el of document.querySelector('.ws-bottom').children) { const b = el.getBoundingClientRect(); o[el.className.split(' ')[0] + ':' + el.id] = [Math.round(b.left), Math.round(b.width)]; } for (const el of document.querySelectorAll('.ws-bottom .vw-btn, .ws-bottom__name > *, .ws-bottom__chips > *')) { const b = el.getBoundingClientRect(); o[el.id] = [Math.round(b.left), Math.round(b.width)]; } return o; });
  console.log(JSON.stringify(r));
}
