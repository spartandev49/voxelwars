// E6: a custom soldier appears in the Placement palette, spawns, fights and dies on the real battlefield; an edited soldier shows its NEW model next time.
import { noAuto, openWorkshop, wsState } from './_util.mjs';
export async function run({ page, shot, step, check, sleep }) {
  await noAuto(page);
  await page.evaluate(() => { try { localStorage.removeItem('vw.soldiers'); localStorage.removeItem('vw.draft.soldier'); } catch (e) { /* ignore */ } });
  await openWorkshop(page);
  await page.fill('#ws-name', 'Brave Test Dummy');
  // paint something so the battle model carries it
  await page.evaluate(() => { window.__ws.doc.setPaint({ head: (() => { const g = { sx: 10, sy: 10, sz: 10, rle: [] }; const d = new Array(1000).fill(0); d[9 * 100 + 5 * 10 + 5] = (1 << 24 | 0xff00ff) >>> 0; let i = 0; const out = []; while (i < d.length) { let n = 1; while (i + n < d.length && d[i + n] === d[i]) n++; out.push(n, d[i]); i += n; } g.rle = out; return g; })() }); });
  await sleep(300);
  await page.click('#ws-battle');
  await page.waitForFunction(() => window.__vw.app.router.current() === 'placement', null, { timeout: 60000 }); await sleep(1500);
  const info = await page.evaluate(() => { const g = window.__vw.game, w = g.world; const mine = w.units.filter((u) => u.def.custom); const saved = JSON.parse(localStorage.getItem('vw.soldiers')).data[0]; return { n: mine.length, team: mine[0] && mine[0].team, faction: mine[0] && mine[0].def.faction, id: saved.id, cost: mine[0] && mine[0].def.cost, foes: w.units.filter((u) => u.team === 1).length, state: g.state, name: mine[0] && mine[0].def.name }; });
  check(info.n === 8 && info.team === 0 && info.faction === 'custom', `a squad of 8 custom soldiers stands in zone A (${info.n}, team ${info.team}, ${info.faction})`);
  check(info.foes > 0, 'a matching enemy army was placed: ' + info.foes);
  // the palette lists him under My Soldiers
  await page.click('#pl-faction-custom'); await sleep(500);
  const card = await page.evaluate((id) => { const c = document.querySelector(`#pl-cards [data-id="${id}"]`); return c ? c.textContent : null; }, info.id); check(card && /Brave Test Dummy/.test(card), 'the Placement palette lists the soldier under My Soldiers: ' + (card || '').slice(0, 40));
  await shot('ws_placement_custom');
  // fight at 4x
  await page.evaluate(() => window.__vw.fight()); await sleep(800); await page.evaluate(() => window.__vw.game.setSpeed(4));
  const st0 = await page.evaluate(() => ({ state: window.__vw.game.state, alive: window.__vw.world.stats.map((x) => x.alive), tick: window.__vw.world.tickN }));
  step('after fight(): ' + JSON.stringify(st0));
  await page.waitForFunction(() => window.__vw.game.state === 'running' || window.__vw.game.state === 'ended', null, { timeout: 120000 }).catch(async (e) => { step('state never became running: ' + JSON.stringify(await page.evaluate(() => ({ state: window.__vw.game.state, tick: window.__vw.world.tickN, paused: window.__vw.game.paused })))); throw e; });
  await sleep(9000);
  const b = await page.evaluate((id) => { const g = window.__vw.game, w = g.world; const sk = g.view.skins.get(id); return { state: g.state, alive: w.units.filter((u) => u.def.custom && u.alive).length, dead: w.dying ? w.dying.length : 0, hasSkin: !!sk, parts: sk ? sk.model.parts.length : 0, anim: w.units.filter((u) => u.def.custom).map((u) => u.anim && u.anim.clip).slice(0, 3), kills: w.stats[0].kills || 0 }; }, info.id);
  check(b.hasSkin && b.parts >= 10, `the battle view built the custom model (${b.parts} parts)`); check(b.state === 'running' || b.state === 'ended', 'battle ran: ' + b.state + ' alive ' + b.alive);
  await shot('ws_battle_custom');
  // edit the soldier and fight again: the NEW model is used (no stale skin)
  const before = await page.evaluate((id) => { const g = window.__vw.game; const sk = g.view.skins.get(id); return sk ? sk.model.byId.head.grid.count() : 0; }, info.id);
  await page.evaluate((id) => window.__vw.goto('workshop', { id }), info.id); await page.waitForSelector('#ws-stage canvas'); await sleep(900);
  await page.click('#ws-cat-head'); await page.click('#ws-slot-head-helm'); await page.click('#ws-part-helms-attic'); await sleep(300);
  await page.click('#ws-battle'); await page.waitForFunction(() => window.__vw.app.router.current() === 'placement', null, { timeout: 60000 }); await sleep(1500);
  const after = await page.evaluate((id) => { const g = window.__vw.game; g.view.update(1, 0.016, g.engine.camera); const sk = g.view.skins.get(id); const c = g.content; const def = c.defs[id]; return { count: sk ? sk.model.byId.head.grid.count() : 0, same: sk ? sk.model === c.modelFor(def, null).model : false, helm: def.model.blueprint.head.helm }; }, info.id);
  check(after.helm === 'attic' && after.same, `after editing, the battle view shows the edited model (helm ${after.helm}, head voxels ${before} -> ${after.count})`);
}
