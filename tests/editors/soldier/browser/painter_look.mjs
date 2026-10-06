export async function run({ page, shot, step, check, sleep }) {
  await page.evaluate(() => window.__vw.app.settings.set('autoScale', false));
  await page.evaluate(() => window.__vw.goto('painter'));
  await page.waitForSelector('#pt-view canvas', { timeout: 20000 });
  await sleep(1500);
  await shot('painter_default');
  check(await page.evaluate(() => !!window.__pt), 'painter mounted');
}
