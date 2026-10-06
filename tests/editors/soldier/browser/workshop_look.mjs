export async function run({ page, shot, step, check, sleep }) {
  await page.evaluate(() => window.__vw.goto('workshop'));
  await page.waitForSelector('#ws-stage canvas', { timeout: 20000 });
  await sleep(1500);
  await shot('workshop_default');
  const ok = await page.evaluate(() => !!document.querySelector('.ws .ws-part'));
  check(ok, 'part tiles rendered');
}
