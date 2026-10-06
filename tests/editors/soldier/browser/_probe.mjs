import { noAuto, openWorkshop, wsState } from './_util.mjs';
export async function run({ page, shot, step, check, sleep }) {
  await noAuto(page); await openWorkshop(page);
  const tiles = await page.$$('#ws-parts .ws-part:not(.is-locked)'); console.log('tiles', tiles.length);
  const before = await wsState(page); console.log(before.helm, before.rev);
  const sel1 = await tiles[1].getAttribute('aria-selected'); console.log('sel', sel1, await tiles[1].getAttribute('id'));
  await tiles[1].click(); await sleep(400);
  const after = await wsState(page); console.log(after.helm, after.rev, await page.evaluate(() => window.__ws.doc.cs.blueprint.head.helm));
  await page.keyboard.press('Control+z'); await sleep(300); console.log('undo ->', (await wsState(page)).helm);
}
