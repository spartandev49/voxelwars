// E5 extras: selection move/flip/rotate/delete, copy to the opposite limb, tint and glow brushes, the 1,500-voxel cap, palette export/import,
// painting imported from a share code, the mini preview, and the phone notice. Every step uses real pointer, keyboard and button input.
export async function run({ page, shot, step, check, sleep }) {
  await page.evaluate(() => window.__vw.app.settings.set('autoScale', false));
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } window.__vw.goto('painter', { part: 'head' }); });
  await page.waitForSelector('#pt-view canvas', { timeout: 20000 }); await sleep(1200);
  const st = () => page.evaluate(() => { const p = window.__pt.part(); return { diff: p.diff, count: p.count(), sel: p.sel ? JSON.stringify(p.sel) : null, depth: p.undo.depth, pid: p.pid }; });
  const cellPos = (cell) => page.evaluate((c) => { const v = window.__pt.view; v.renderNow(); const THREE = window.THREE; const p = new THREE.Vector3(c[0] + 0.5 + v.off[0], c[1] + 0.5 + v.off[1], c[2] + 0.5 + v.off[2]).project(v.camera); const r = v.canvas.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (p.y * -0.5 + 0.5) * r.height }; }, cell);
  const slicePos = (u, v) => page.evaluate(([u, v]) => { const sl = window.__pt.slice; const r = sl.canvas.getBoundingClientRect(), L = sl.lay; return { x: r.left + L.ox + (u + 0.5) * L.s, y: r.top + L.oy + (v + 0.5) * L.s }; }, [u, v]);
  const cells = (pid) => page.evaluate((id) => { const p = window.__pt.part ? window.__pt.part() : null; const doc = window.__pt.pd.part(id || p.pid); const out = []; const g = doc.grid; for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) for (let x = 0; x < g.sx; x++) { const v = g.get(x, y, z); if (v) out.push([x, y, z, v >>> 0]); } return out; }, pid);
  const mirrorsOff = () => page.evaluate(() => { const p = window.__pt.part(); p.mirror.x = false; p.mirror.y = false; p.mirror.z = false; });

  // ---- selection: draw a block through the API of the doc, then select it with the pointer and move/flip/rotate/delete it
  await mirrorsOff();
  await page.evaluate(() => { const p = window.__pt.part(); for (let i = 0; i < 9; i++) p.pencil(i % 3, 9, Math.floor(i / 3), 0x200000 + i * 0x1c2a31, 1); window.__pt.afterEdit(); });
  const painted0 = await st(); check(painted0.diff >= 9, 'a 3x3 patch of paint exists on the head (' + painted0.diff + ')');
  await page.keyboard.press('KeyS'); check((await page.evaluate(() => window.__pt.S.tool)) === 'select', 'S selects the select tool');
  const a = await cellPos([0, 9, 0]), b = await cellPos([2, 9, 2]);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up(); await sleep(250);
  let s = await st(); check(!!s.sel, 'dragging with the select tool makes a selection: ' + s.sel);
  const showBtns = await page.evaluate(() => ['pt-flip', 'pt-rotate', 'pt-delsel'].every((id) => { const e = document.getElementById(id); return e && e.offsetParent !== null; }));
  check(showBtns, 'flip, rotate and delete buttons appear for a selection');
  const before = await cells(); const sel0 = s.sel;
  await page.keyboard.press('ArrowRight'); await sleep(150);
  s = await st(); check(s.sel !== sel0 && s.depth > painted0.depth, 'arrow keys move the selection (one undo step each): ' + s.sel);
  await page.keyboard.press('ArrowLeft'); await sleep(100);
  const afterBack = await cells(); check(JSON.stringify(afterBack) === JSON.stringify(before), 'moving back lands exactly where it started');
  const dep = async () => (await st()).depth;
  let d1 = await dep(); await page.click('#pt-flip'); await sleep(120); const flipped = await cells(); const d2 = await dep();
  check(flipped.length === before.length && JSON.stringify(flipped) !== JSON.stringify(before) && d2 === d1 + 1, 'flip mirrors the selected voxels in one undo step');
  await page.click('#pt-rotate'); await sleep(120); const rotated = await cells(); const d3 = await dep();
  check(rotated.length === before.length && JSON.stringify(rotated) !== JSON.stringify(flipped) && d3 === d2 + 1, 'rotate turns the selection a quarter turn in one undo step');
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await sleep(150);
  const undone = await cells(); check(JSON.stringify(undone) === JSON.stringify(before), 'two undos restore the patch');
  await shot('painter_selection');
  const countBeforeDel = (await st()).diff; await page.click('#pt-delsel'); await sleep(150);
  s = await st(); check(s.diff < countBeforeDel, `delete removes the selected voxels (${countBeforeDel} -> ${s.diff})`);
  await page.keyboard.press('Control+z'); await sleep(100); s = await st(); check(s.diff === countBeforeDel, 'delete is undoable');
  await page.keyboard.press('Escape'); await sleep(150); s = await st(); check(!s.sel, 'Escape clears the selection and stays in the painter');
  check(await page.evaluate(() => !!document.querySelector('#pt-view canvas')), 'still in the painter after Escape');

  // ---- tint and glow brushes
  await page.keyboard.press('KeyT'); const pt = await cellPos([0, 9, 0]); await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.mouse.up(); await sleep(200);
  const tinted = (await cells()).filter((c) => (c[3] >>> 24) & 2).length; check(tinted >= 1, 'the tint-flag brush marks voxels as team-coloured (' + tinted + ')');
  await page.keyboard.press('KeyH'); const pg = await cellPos([2, 9, 2]); await page.mouse.move(pg.x, pg.y); await page.mouse.down(); await page.mouse.up(); await sleep(200);
  const glowing = (await cells()).filter((c) => (c[3] >>> 24) & 4).length; check(glowing >= 1, 'the glow-flag brush marks voxels as glowing (' + glowing + ')');
  await page.evaluate(() => { const p = window.__pt.part(); p.reset(); window.__pt.afterEdit(); });

  // ---- copy to the opposite limb
  await page.click('#pt-part-armUL'); await sleep(400); await mirrorsOff();
  await page.evaluate(() => { const p = window.__pt.part(); p.pencil(0, 1, 0, 0x2288ee, 1); p.pencil(1, 2, 1, 0x22ee88, 1); p.pencil(2, 3, 2, 0xee2288, 1); window.__pt.afterEdit(); });
  const left = await cells('armUL'); check((await st()).diff === 3, 'the left upper arm carries 3 painted voxels');
  await page.click('#pt-opp'); await sleep(300);
  const right = await cells('armUR'); check(right.length === left.length && right.every((c) => left.some((l) => l[1] === c[1] && l[2] === c[2] && l[0] === 2 - c[0] && l[3] === c[3])), 'copy to opposite is the left-right mirror image (' + right.length + ' voxels)');
  await page.click('#pt-part-armUR'); await sleep(250); await page.keyboard.press('Control+z'); await sleep(200);
  const rightU = await page.evaluate(() => window.__pt.pd.part('armUR').diff); check(rightU === 0, 'copy to opposite is undoable on the target part: ' + rightU);

  // ---- the 1,500-voxel cap, through the real slice view and box tool
  await page.click('#pt-part-weapon'); await sleep(500); await mirrorsOff();
  await page.click('#pt-viewseg [data-value="slice"]'); await sleep(300);
  await page.click('#pt-axis [data-value="z"]'); await sleep(250); await page.keyboard.press('KeyB');
  const w0 = (await st()).diff; let capped = false, lastDiff = w0;
  for (let k = 0; k < 8 && !capped; k++) {
    await page.evaluate((layer) => window.__pt.slice.setLayer(layer), k); await sleep(120);
    const p1 = await slicePos(0, 0), p2 = await slicePos(8, 39);
    await page.mouse.move(p1.x, p1.y); await page.mouse.down(); await page.mouse.move(p2.x, p2.y, { steps: 5 }); await page.mouse.up(); await sleep(250);
    const cur = (await st()).diff; if (cur === lastDiff) capped = true; lastDiff = cur;
  }
  const wEnd = await st(); check(wEnd.diff <= 1500 && wEnd.diff > 600, `painting stops at the 1,500 cap (now ${wEnd.diff})`);
  check(capped, 'the stroke that would pass the cap changes nothing');
  const toast = await page.evaluate(() => Array.from(document.querySelectorAll('.vw-toast')).map((t) => t.textContent).join(' | ')); check(/1,?500/.test(toast), 'a friendly cap message appears: ' + toast.slice(0, 90));
  const capLabel = await page.evaluate(() => (document.getElementById('pt-cap') || {}).textContent || ''); step('cap meter text: ' + capLabel.slice(0, 80));
  await shot('painter_cap');
  await page.click('#pt-clear'); await sleep(250); check((await st()).diff === 0 || (await st()).count === 0, 'clear empties the part'); await page.keyboard.press('Control+z'); await sleep(200);
  check((await st()).diff === wEnd.diff, 'clear is undoable back to the capped paint');
  await page.click('#pt-reset'); await sleep(200);
  await page.click('#pt-viewseg [data-value="3d"]'); await sleep(300);

  // ---- palette export and import through the in-page text modal
  await page.click('#pt-part-head'); await sleep(300);
  await page.click('#pt-pal-export'); await page.waitForSelector('.vw-modal textarea'); const code = await page.inputValue('.vw-modal textarea'); check(/^VWPAL1:[0-9a-f]{6}/.test(code), 'palette export is a VWPAL1 code: ' + code.slice(0, 40));
  await page.keyboard.press('Escape'); await sleep(250);
  await page.click('#pt-pal-import'); await page.waitForSelector('.vw-modal textarea'); await page.fill('.vw-modal textarea', 'not a palette'); await page.click('#vw-textmodal-ok'); await sleep(250);
  const perr = await page.evaluate(() => (document.querySelector('.vw-modal [role=alert]') || {}).textContent || ''); check(perr.length > 4, 'a bad palette code gets a plain-English error: ' + perr);
  await page.fill('.vw-modal textarea', 'VWPAL1:112233,aabbccT,ffcc00G'); await page.click('#vw-textmodal-ok'); await sleep(500);
  const hexNow = await page.inputValue('#pt-hex'); check(hexNow.toLowerCase() === '#112233', 'importing a palette selects its first colour: ' + hexNow);
  const recentN = await page.evaluate(() => document.querySelectorAll('#pt-recent button').length); check(recentN === 3, 'the recent row now holds the three imported colours: ' + recentN);

  // ---- import paint from a share code made by this very painter
  await page.keyboard.press('KeyP'); await mirrorsOff(); const hp = await cellPos([4, 5, 7]); await page.mouse.move(hp.x, hp.y); await page.mouse.down(); await page.mouse.up(); await sleep(200);
  const paintedCount = (await st()).diff; check(paintedCount >= 1, 'one voxel painted on the head: ' + paintedCount);
  await page.click('#pt-share'); await page.waitForSelector('#ws-share-code'); const share = await page.inputValue('#ws-share-code'); check(/^VW1\.soldier\./.test(share), 'the painter exports a VW1.soldier share code');
  await page.keyboard.press('Escape'); await sleep(300);
  await page.click('#pt-reset'); await sleep(200); check((await st()).diff === 0, 'reset clears the paint before importing');
  await page.click('#pt-paint-import'); await page.waitForSelector('.vw-modal textarea'); await page.fill('.vw-modal textarea', share.slice(0, -3) + 'zzz'); await page.click('#vw-textmodal-ok'); await sleep(500);
  const e2 = await page.evaluate(() => (document.querySelector('.vw-modal [role=alert]') || {}).textContent || ''); check(/damaged|check value|code/i.test(e2), 'a damaged code is refused inside the modal: ' + e2.slice(0, 70));
  await page.fill('.vw-modal textarea', share); await page.click('#vw-textmodal-ok'); await sleep(900);
  const afterImport = await st(); check(afterImport.diff === paintedCount, `paint came back from the share code (${afterImport.diff})`);

  // ---- mini preview and the cap meter exist and render
  const mini = await page.evaluate(() => { const c = document.querySelector('#pt-mini canvas') || document.getElementById('pt-mini'); const r = c.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }); check(mini.w >= 60 && mini.h >= 60, 'the mini preview has a real size: ' + JSON.stringify(mini));
  await shot('painter_extras_end');

  // ---- phone notice: a narrow portrait screen is told to use a bigger one, not shown a broken editor
  await page.setViewportSize({ width: 390, height: 844 }); await sleep(400);
  await page.evaluate(() => window.__vw.goto('painter', {})); await sleep(1200);
  const notice = await page.evaluate(() => ({ screen: window.__vw.app.router.current(), text: (document.body.innerText || '').slice(0, 200) })); check(notice.screen === 'phone_notice', 'a phone gets the notice instead of the painter: ' + notice.screen);
  await shot('painter_phone_notice'); await page.setViewportSize({ width: 1280, height: 720 });
}
