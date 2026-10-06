// Roster (save / library / duplicate / rename / delete with in-page modals), share code export + import, hostile import, roster cap, draft resume (E7 / E8 / UI).
import { noAuto, openWorkshop, wsState } from './_util.mjs';
export async function run({ page, shot, step, check, sleep }) {
  await noAuto(page);
  await page.evaluate(() => { try { localStorage.removeItem('vw.soldiers'); localStorage.removeItem('vw.draft.soldier'); } catch (e) { /* ignore */ } });
  await openWorkshop(page);
  const saved = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('vw.soldiers')).data; } catch (e) { return []; } });
  // ---- save
  await page.fill('#ws-name', 'Sir Testicus the Thorough'); await sleep(200);
  check((await wsState(page)).dirty === true, 'editing marks the soldier dirty');
  await page.click('#ws-save'); await sleep(600);
  let list = await saved(); check(list.length === 1 && list[0].name === 'Sir Testicus the Thorough', 'Save to roster stores the soldier: ' + list.length);
  check(typeof list[0].thumb === 'string' && list[0].thumb.startsWith('data:image/jpeg') && list[0].thumb.length < 9000, 'a JPEG thumbnail <= ~8 KB is stored: ' + (list[0].thumb || '').length);
  check(list[0].stats && list[0].blueprint && list[0].blueprint.id === list[0].id, 'stored item follows the CustomSoldier schema');
  check((await wsState(page)).dirty === false, 'saved: no longer dirty');
  await shot('ws_saved');
  // ---- library: duplicate, rename, delete (in-page confirm modal)
  await page.click('#ws-library'); await page.waitForSelector('#ws-lib-grid .ws-libcard'); await sleep(400); await shot('ws_library');
  check((await page.$$('#ws-lib-grid .ws-libcard')).length === 1, 'library lists one soldier');
  await page.click('#ws-lib-duplicate-' + list[0].id); await sleep(500);
  list = await saved(); check(list.length === 2, 'duplicate adds a second soldier: ' + list.length);
  const dup = list.find((x) => x.id !== list[1].id) || list[0];
  const idDup = list[0].id; await page.click('#ws-lib-rename-' + idDup); await page.waitForSelector('#ws-rename-input'); await page.fill('#ws-rename-input', 'Renamed Randall'); await page.click('#ws-rename-ok'); await sleep(500);
  list = await saved(); check(list.some((x) => x.name === 'Renamed Randall'), 'rename through the in-page modal');
  await page.click('#ws-lib-delete-' + idDup); await page.waitForSelector('.vw-modal [id^="vw-modal"]', { timeout: 3000 }).catch(() => {});
  await sleep(300); const askText = await page.evaluate(() => (document.querySelector('.vw-modal') || {}).textContent || ''); check(/gone for good/.test(askText), 'delete asks in an in-page modal: ' + askText.slice(0, 60));
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.vw-modal-wrap:last-child .vw-modal__foot button')).find((x) => /^Delete$/i.test(x.textContent.trim())); b.click(); }); await sleep(500);
  list = await saved(); check(list.length === 1, 'deleted: ' + list.length);
  await page.keyboard.press('Escape'); await sleep(400);
  // ---- share: export code, length and size class, then import it back
  await page.click('#ws-share'); await page.waitForSelector('#ws-share-code'); await sleep(400);
  const code = await page.inputValue('#ws-share-code'); const lenChip = await page.textContent('#ws-share-len');
  check(/^VW1\.soldier\./.test(code) && code.length < 1800 && /size S/.test(lenChip), 'share code shows its length and size class: ' + lenChip + ' / ' + code.slice(0, 30));
  await shot('ws_share'); await page.keyboard.press('Escape'); await sleep(300);
  await page.click('#ws-import'); await page.waitForSelector('#ws-import-code'); await page.fill('#ws-import-code', code.slice(0, -4) + 'AAAA'); await page.click('#ws-import-ok'); await sleep(500);
  const err1 = await page.textContent('#ws-import-error'); check(/damaged|check value/i.test(err1), 'a corrupted code is refused in plain English: ' + err1);
  await page.fill('#ws-import-code', 'hello world'); await page.click('#ws-import-ok'); await sleep(300); check(/does not look like a VOXELWARS code/.test(await page.textContent('#ws-import-error')), 'nonsense is refused');
  await page.fill('#ws-import-code', code); await page.click('#ws-import-ok'); await sleep(900); await shot('ws_import_preview');
  const prev = await page.textContent('#ws-import-preview'); check(/Sir Testicus/.test(prev), 'valid code shows a preview before accepting: ' + prev.slice(0, 50));
  await page.click('#ws-import-ok'); await sleep(900);
  list = await saved(); check(list.length === 2 && new Set(list.map((x) => x.id)).size === 2, 'imported soldier got a fresh id: ' + list.map((x) => x.id).join(','));
  // ---- hostile name renders as text
  await page.fill('#ws-name', '<img src=x onerror=window.__pwned=1>'); await sleep(200); await page.click('#ws-library'); await page.waitForSelector('#ws-lib-grid'); await sleep(300);
  check((await page.evaluate(() => window.__pwned)) === undefined && (await page.evaluate(() => document.querySelectorAll('#ws-lib-grid img[onerror]').length)) === 0, 'markup in a name is text, not HTML'); await page.keyboard.press('Escape'); await sleep(300);
  // ---- the roster cap (24)
  await page.evaluate(() => { const l = JSON.parse(localStorage.getItem('vw.soldiers')).data; const base = l[0]; const items = []; for (let i = 0; i < 24; i++) items.push(Object.assign({}, base, { id: 'cs_fill' + i, name: 'Filler ' + i, blueprint: Object.assign({}, base.blueprint, { id: 'cs_fill' + i }) })); localStorage.setItem('vw.soldiers', JSON.stringify({ v: 1, data: items })); });
  await page.fill('#ws-name', 'Number Twenty Five'); await page.click('#ws-save'); await page.waitForSelector('.vw-modal'); await sleep(300);
  const full = await page.evaluate(() => (document.querySelector('.vw-modal') || {}).textContent || ''); check(/roster is full/i.test(full), 'the 25th soldier is refused with a plain message');
  await page.keyboard.press('Escape'); await sleep(300);
  check((await saved()).length === 24, 'roster stays at 24');
  // ---- draft: leave dirty, come back, resume
  await page.evaluate(() => window.__vw.goto('title')); await sleep(600);
  await page.evaluate(() => window.__vw.goto('workshop')); await page.waitForSelector('.vw-modal', { timeout: 5000 }); await sleep(300);
  const dtext = await page.evaluate(() => (document.querySelector('.vw-modal') || {}).textContent || ''); check(/Unfinished business/.test(dtext), 'unsaved work is offered back: ' + dtext.slice(0, 40));
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.vw-modal-wrap:last-child .vw-modal__foot button')).find((x) => /Resume/i.test(x.textContent)); b.click(); }); await sleep(600);
  check((await wsState(page)).name === 'Number Twenty Five', 'draft resumed with the unsaved name');
}
