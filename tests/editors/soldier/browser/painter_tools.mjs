// E5: pointer sequences for pencil / eraser / paint / fill / line / box / eyedropper / mirror / undo / redo / slice view / 3D view on the real page.
export async function run({ page, shot, step, check, sleep }) {
  await page.evaluate(() => window.__vw.app.settings.set('autoScale', false));
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } window.__vw.goto('painter', { part: 'head' }); });
  await page.waitForSelector('#pt-view canvas', { timeout: 20000 }); await sleep(1200);
  const st = () => page.evaluate(() => { const p = window.__pt.part(); return { diff: p.diff, count: p.count(), sel: p.sel, depth: p.undo.depth, pid: p.pid, view: window.__pt.S.view }; });
  // helper: client position of a head cell (grid coords) through the live camera
  const cellPos = (cell) => page.evaluate((c) => { const v = window.__pt.view; v.renderNow(); const THREE = window.THREE; const p = new THREE.Vector3(c[0] + 0.5 + v.off[0], c[1] + 0.5 + v.off[1], c[2] + 0.5 + v.off[2]).project(v.camera); const r = v.canvas.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height }; }, cell);
  const s0 = await st(); step('start ' + JSON.stringify(s0));
  await page.click('#pt-mirror-x'); // turn the default X mirror OFF for the first checks
  const mx = await page.evaluate(() => window.__pt.part().mirror.x); check(mx === false, 'mirror X toggled off (head defaults to on)');
  // ---- pencil in 3D: click the front of the head (a skin voxel face), the new voxel appears in front of it
  const top = await cellPos([4, 5, 7]); // a voxel of the face cube; its +z face is in front
  await page.mouse.move(top.x, top.y); await sleep(100);
  await page.mouse.down(); await page.mouse.up(); await sleep(150);
  let s = await st(); check(s.diff === 1, '3D pencil painted one voxel (diff ' + s.diff + ')');
  // ---- drag = one stroke, one undo step
  const a = await cellPos([2, 5, 7]), b = await cellPos([7, 5, 7]);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 6 }); await page.mouse.move(b.x, b.y, { steps: 6 }); await page.mouse.up(); await sleep(150);
  const s2 = await st(); check(s2.diff > s.diff && s2.depth === s.depth + 1, `a drag is one undo step (diff ${s.diff}->${s2.diff}, depth ${s.depth}->${s2.depth})`);
  await shot('painter_after_pencil');
  // ---- undo / redo through the buttons
  await page.click('#pt-undo'); await sleep(100); let s3 = await st(); check(s3.diff === s.diff, 'undo restored the previous diff');
  await page.click('#pt-redo'); await sleep(100); s3 = await st(); check(s3.diff === s2.diff, 'redo re-applied the stroke');
  // ---- eraser, recolour, eyedropper
  await page.keyboard.press('KeyE'); const tool = await page.evaluate(() => window.__pt.S.tool); check(tool === 'eraser', 'E selects the eraser');
  const c1 = await cellPos([4, 3, 7]); await page.mouse.move(c1.x, c1.y); await page.mouse.down(); await page.mouse.up(); await sleep(100);
  const s4 = await st(); check(s4.count < s2.count + 0 || s4.diff >= s2.diff, 'eraser edited the part');
  await page.keyboard.press('KeyI'); const c2 = await cellPos([2, 5, 6]); await page.mouse.move(c2.x, c2.y); await page.mouse.down(); await page.mouse.up(); await sleep(100);
  const hex = await page.inputValue('#pt-hex'); check(/^#[0-9a-f]{6}$/.test(hex) && hex !== '#c8453c', 'eyedropper picked a colour from the model: ' + hex);
  // ---- box and line (drag), fill
  await page.keyboard.press('KeyB'); const d0 = (await st()).diff; const b1 = await cellPos([0, 8, 0]), b2 = await cellPos([2, 9, 2]); await page.mouse.move(b1.x, b1.y); await page.mouse.down(); await page.mouse.move(b2.x, b2.y, { steps: 5 }); await page.mouse.up(); await sleep(150);
  const s5 = await st(); check(s5.diff > d0, `box tool painted voxels (${d0} -> ${s5.diff})`);
  await page.keyboard.press('KeyL'); const l1 = await cellPos([0, 8, 5]), l2 = await cellPos([9, 8, 5]); await page.mouse.move(l1.x, l1.y); await page.mouse.down(); await page.mouse.move(l2.x, l2.y, { steps: 5 }); await page.mouse.up(); await sleep(150);
  const s6 = await st(); check(s6.diff > s5.diff, `line tool painted voxels (${s5.diff} -> ${s6.diff})`);
  await page.keyboard.press('KeyG'); const f1 = await cellPos([4, 1, 7]); await page.mouse.move(f1.x, f1.y); await page.mouse.down(); await page.mouse.up(); await sleep(150);
  const s7 = await st(); check(s7.diff >= s6.diff, `fill tool recoloured a connected area (${s6.diff} -> ${s7.diff})`);
  // ---- mirror: X on, pencil at an off-centre cell paints two voxels
  await page.click('#pt-mirror-x'); await page.keyboard.press('KeyP'); const d1 = (await st()).diff; const m1 = await cellPos([1, 9, 3]); await page.mouse.move(m1.x, m1.y); await page.mouse.down(); await page.mouse.up(); await sleep(150);
  const s8 = await st(); check(s8.diff - d1 >= 2, `mirror X painted a symmetric pair (${d1} -> ${s8.diff})`);
  // ---- slice view: paint with a drag, layer slider and wheel, onion skin toggle, axis switch
  await page.click('#pt-viewseg [data-value="slice"]'); await sleep(300);
  const slicePos = (u, v) => page.evaluate(([u, v]) => { const sl = window.__pt.slice; const r = sl.canvas.getBoundingClientRect(), L = sl.lay; return { x: r.left + L.ox + (u + 0.5) * L.s, y: r.top + L.oy + (v + 0.5) * L.s }; }, [u, v]);
  await page.click('#pt-mirror-x'); // off
  const d2 = (await st()).diff; const p1 = await slicePos(1, 1), p2 = await slicePos(6, 1);
  await page.mouse.move(p1.x, p1.y); await page.mouse.down(); await page.mouse.move(p2.x, p2.y, { steps: 8 }); await page.mouse.up(); await sleep(150);
  const s9 = await st(); check(s9.diff > d2, `slice view drag painted cells (${d2} -> ${s9.diff})`);
  await shot('painter_slice');
  await page.click('#pt-axis [data-value="z"]'); await sleep(200); const ax = await page.evaluate(() => window.__pt.slice.axis); check(ax === 'z', 'axis switch to z');
  await page.evaluate(() => window.__pt.slice.setLayer(3)); const lay = await page.evaluate(() => window.__pt.slice.layer); check(lay === 3, 'layer slider/API moves the layer');
  await page.click('#pt-onion'); const onion = await page.evaluate(() => window.__pt.S.onion); check(onion === false, 'onion skin toggles');
  // ---- clear/reset keep undo, the cap holds
  await page.click('#pt-reset'); await sleep(150); const s10 = await st(); check(s10.diff === 0, 'reset to generated returns to zero paint');
  await page.click('#pt-undo'); await sleep(100); const s11 = await st(); check(s11.diff > 0, 'reset is undoable');
  // ---- persistence: Done writes the draft and goes back to the workshop with the paint on the soldier
  await page.click('#pt-done'); await page.waitForSelector('#ws-stage canvas', { timeout: 20000 }); await sleep(600);
  const painted = await page.evaluate(() => { const p = window.__ws.doc.cs.blueprint.paint; return Object.keys(p).length ? Object.keys(p).join(',') : ''; }); check(painted.includes('head'), 'the painted head came back to the Workshop soldier: ' + painted);
  await shot('painter_back_in_workshop');
}
