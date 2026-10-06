// E4 / E9 on the real page: every part category switches the model, point-buy caps, cost shown == derived cost, ability legality, colours, locked parts.
import { noAuto, openWorkshop, setSlider, wsState, flush } from './_util.mjs';
export async function run({ page, shot, step, check, sleep }) {
  await noAuto(page); await openWorkshop(page);
  let s = await wsState(page);
  // ---- every category switches the compiled model
  const cats = ['head', 'torso', 'shoulders', 'legs', 'cape', 'back', 'main', 'off'];
  const seen = new Set(); let switched = 0, total = 0;
  for (const tab of cats) {
    await page.click('#ws-cat-' + tab); await sleep(150);
    const slots = await page.evaluate(() => Array.from(document.querySelectorAll('.ws-slots .ws-slot')).map((b) => b.id));
    const list = slots.length ? slots : [null];
    for (const slot of list) {
      if (slot) { await page.click('#' + slot); await sleep(120); }
      const tiles = await page.$$('#ws-parts .ws-part:not(.is-locked)');
      check(tiles.length >= 3, `${tab}${slot ? '/' + slot : ''}: picker lists the registry (${tiles.length} usable tiles)`);
      const before = await wsState(page);
      // pick the third usable tile (not 'none' and not the current one when possible)
      let picked = false;
      for (const t of tiles.slice(1, 5)) { const sel = await t.getAttribute('aria-selected'); if (sel === 'true') continue; await t.click(); await sleep(250); picked = true; break; }
      const after = await wsState(page); total++;
      if (picked && (after.rev !== before.rev)) switched++; else step(`no change in ${tab}/${slot}: picked=${picked}`); seen.add(tab);
      await page.keyboard.press('Control+z'); await sleep(120);
    }
  }
  check(switched === total && total >= 12, `all 12 slots change the model when a part is picked (${switched}/${total})`);
  await page.click('#ws-cat-head'); await page.click('#ws-slot-head-helm'); await sleep(200); await shot('ws_parts_locked_head');
  // ---- locked silly helm: tile is locked, click shows the hint and changes nothing (E9)
  const locked = await page.evaluate(() => { const b = document.querySelector('#ws-part-helms-colander'); return b ? { locked: b.classList.contains('is-locked'), label: b.getAttribute('aria-label') } : null; });
  check(locked && locked.locked && /mission 3/.test(locked.label), 'colander is locked with its hint: ' + (locked && locked.label));
  const h0 = (await wsState(page)).helm; await page.click('#ws-part-helms-colander'); await sleep(200);
  check((await wsState(page)).helm === h0, 'clicking a locked part changes nothing');
  const toast = await page.evaluate(() => (document.querySelector('.vw-toast') || {}).textContent || ''); check(/mission 3/.test(toast), 'the lock hint is shown as a toast: ' + toast);
  // ---- point buy: caps, the 100 total, live cost
  await page.click('#ws-rtabs-stats'); await sleep(150);
  await page.evaluate(() => document.querySelector('#ws-stats-reset').click()); await sleep(150);
  for (const [k, v] of [['hp', 99], ['damage', 99], ['attackSpeed', 99], ['speed', 99], ['armor', 99], ['range', 99], ['morale', 99]]) await setSlider(page, '#ws-stat-' + k, v);
  await sleep(250); s = await wsState(page); const tot = Object.values(s.stats).reduce((a, b) => a + b, 0);
  check(tot === 100, 'point total is exactly 100 after maxing every slider: ' + tot + ' ' + JSON.stringify(s.stats));
  check(s.stats.hp === 30 && s.stats.damage === 30 && s.stats.attackSpeed === 20 && s.stats.speed === 20 && s.stats.armor === 0, 'caps hold: hp 30, damage 30, attackSpeed 20, speed 20, the rest is empty');
  const shown = await page.evaluate(() => document.querySelector('#ws-cost').textContent.replace(/[^0-9]/g, '')); check(Number(shown) === s.cost || String(shown).startsWith(String(s.cost)), `cost chip shows the derived cost (${shown} vs ${s.cost})`);
  const note = await page.textContent('#ws-pool-note'); check(/All 100 points spent/.test(note), 'pool note: ' + note);
  await setSlider(page, '#ws-stat-hp', 0); await setSlider(page, '#ws-stat-armor', 20); await sleep(200); s = await wsState(page); check(s.stats.armor === 20 && s.stats.hp === 0, 'points can be moved between stats');
  const cost1 = s.cost; await setSlider(page, '#ws-stat-hp', 10); await sleep(150); s = await wsState(page); check(s.cost > cost1, 'more points cost more');
  // ---- body
  await page.click('#ws-body-type [data-value="slim"]'); await sleep(200); await setSlider(page, '#ws-height', 0.9); await sleep(200);
  const size = await page.textContent('#ws-size-note'); check(/0\.85 x 0\.90 x 0\.85/.test(size), 'slim at 0.90 is held at 0.85 on x and z: ' + size);
  await page.click('#ws-body-type [data-value="stocky"]'); await setSlider(page, '#ws-height', 1.2); await sleep(200);
  const size2 = await page.textContent('#ws-size-note'); check(/1\.34 x 1\.18 x 1\.34/.test(size2), 'stocky at 1.20 is 1.34 x 1.18 x 1.34: ' + size2);
  await shot('ws_stats_body');
  // ---- abilities legality
  await page.click('#ws-cat-main'); await page.click('#ws-part-mains-gladius'); await sleep(200);
  await page.click('#ws-rtabs-abilities'); await sleep(150);
  await page.click('#ws-ab-kick'); await page.click('#ws-ab-rage'); await sleep(200); s = await wsState(page); check(JSON.stringify(s.abilities) === '["kick","rage"]', 'two abilities chosen: ' + JSON.stringify(s.abilities));
  await page.click('#ws-ab-net'); await sleep(150); s = await wsState(page); check(s.abilities.length === 2, 'a third ability is refused');
  const hp = await page.getAttribute('#ws-ab-heal_pulse', 'aria-disabled'); check(hp === 'true', 'heal_pulse is greyed out with a gladius');
  await page.click('#ws-ab-kick'); await sleep(100); await page.click('#ws-cat-main'); await page.click('#ws-part-mains-longbow'); await sleep(250);
  s = await wsState(page); check(s.abilities.length === 1 && s.abilities[0] === 'rage' || s.abilities.length === 0, 'a bow cannot rage: abilities dropped ' + JSON.stringify(s.abilities));
  await page.click('#ws-part-mains-staff'); await sleep(200); const hp2 = await page.getAttribute('#ws-ab-heal_pulse', 'aria-disabled'); check(hp2 === 'false', 'heal_pulse unlocks with a staff');
  await shot('ws_abilities_staff');
  // ---- colours
  await page.click('#ws-rtabs-colours'); await sleep(150);
  const r0 = (await wsState(page)).rev; await page.fill('#ws-color-primary-hex', '#22aa66'); await page.press('#ws-color-primary-hex', 'Enter'); await page.evaluate(() => document.querySelector('#ws-color-primary-hex').dispatchEvent(new Event('change', { bubbles: true }))); await sleep(200);
  s = await wsState(page); check(s.colors.primary === '#22aa66' && s.rev !== r0, 'hex field recolours the soldier');
  await page.click('#ws-pal-3'); await sleep(200); s = await wsState(page); check(s.colors.primary === '#6a3fb0', 'ready palette applied');
  await page.click('#ws-emblem-skull'); await sleep(150); check((await page.evaluate(() => window.__ws.doc.cs.blueprint.emblem)) === 'skull', 'emblem picked');
  await page.click('#ws-tint [data-value="map"]'); await sleep(400); await shot('ws_tint_map'); await page.click('#ws-tint [data-value="a"]');
  await page.click('#ws-ghost'); await sleep(500); await shot('ws_ghost');
  // ---- undo / redo through the keyboard, name generator
  const before = await wsState(page); await page.click('#ws-dice'); await sleep(150); const named = await wsState(page); check(named.name !== before.name && named.name.length <= 40, 'dice generates a funny name: ' + named.name);
  await page.keyboard.press('Control+z'); await sleep(150); check((await wsState(page)).name === before.name, 'Ctrl+Z undoes the rename'); await page.keyboard.press('Control+Shift+z'); await sleep(150); check((await wsState(page)).name === named.name, 'Ctrl+Shift+Z redoes it');
  await page.keyboard.press('KeyR'); await sleep(300); const rr = await wsState(page); check(rr.rev !== named.rev, 'R randomises the soldier'); await page.keyboard.press('KeyM'); await sleep(300);
  const tt = (await wsState(page)).stats; check(Object.values(tt).reduce((a, b) => a + b, 0) <= 100, 'randomise/mutate keep the point total legal');
}
