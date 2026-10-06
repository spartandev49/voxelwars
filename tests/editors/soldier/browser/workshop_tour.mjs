export async function run({ page, shot, step, check, sleep }) {
  await page.evaluate(() => window.__vw.goto('workshop'));
  await page.waitForSelector('#ws-stage canvas', { timeout: 20000 });
  await sleep(1200);
  await shot('ws_00_default');
  for (const tab of ['abilities', 'colours', 'personality', 'paint']) {
    await page.click('#ws-rtabs-' + tab); await sleep(400); await shot('ws_tab_' + tab);
  }
  await page.click('#ws-cat-main'); await sleep(400); await shot('ws_cat_main');
  await page.click('#ws-rtabs-stats'); await sleep(300);
}
