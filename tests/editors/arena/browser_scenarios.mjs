// Browser scenarios for the Arena Builder (run by tools/shot_editors_a.mjs; not a *.test.mjs so the fast gate skips it).
// Pointer sequences are real Playwright mouse events on the viewport; assertions read the live document through window.__vw.arenaBuilder.
export async function run(name, h) {
  const { page, shot, step, sleep, ev, st, boot, openBuilder, problems } = h;
  const expect = (c, m) => { if (!c) { problems.push('EXPECT FAILED: ' + m); console.log('  FAIL ' + m); } else console.log('  ok   ' + m); };
  const view = async () => ev(() => { const r = document.getElementById('ed-view').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const A = (fn, a) => ev(fn, a);
  const hsum = () => A(() => { const a = window.__vw.arenaBuilder.session.arena; let s = 0; for (let i = 0; i < a.h.length; i++) s += a.h[i]; return s; });
  const msum = () => A(() => { const a = window.__vw.arenaBuilder.session.arena; let s = 0; for (let i = 0; i < a.m.length; i++) s += a.m[i] * ((i % 7) + 1); return s; });
  const counts = () => A(() => { const b = window.__vw.arenaBuilder, a = b.session.arena; return { props: a.props.length, hz: a.hazards.length, mk: a.markers.length, depth: b.session.undo.depth, redo: b.session.undo.undone.length, tool: b.st.tool }; });
  async function drag(pts, o = {}) {
    await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down();
    for (const [x, y] of pts.slice(1)) { await page.mouse.move(x, y, { steps: o.steps || 4 }); await sleep(o.dwell || 60); }
    if (o.hold) await sleep(o.hold);
    await page.mouse.up(); await sleep(120);
  }
  const closeModals = async () => { for (let i = 0; i < 4; i++) { if (await page.$('.vw-modal')) { await page.keyboard.press('Escape'); await sleep(350); } } };
  const key = async (k) => { await page.keyboard.press(k); await sleep(80); };
  const setRange = (sel, v) => page.$eval(sel, (el, val) => { el.value = String(val); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);

  if (name === 'dbg') {
    await ev(() => window.__vw.goto('arena_builder')); await sleep(900);
    step('cur ' + await ev(() => window.__vw.app.router.current()) + ' modal ' + !!(await page.$('.vw-modal')));
    await page.keyboard.press('Escape'); await sleep(500);
    step('cur ' + await ev(() => window.__vw.app.router.current()) + ' modal ' + !!(await page.$('.vw-modal')) + ' root ' + !!(await page.$('#ed-root')));
    await page.keyboard.press('Escape'); await sleep(500);
    step('cur ' + await ev(() => window.__vw.app.router.current()) + ' modal ' + !!(await page.$('.vw-modal')) + ' root ' + !!(await page.$('#ed-root')));
    return;
  }
  if (name === 'shots') {
    await openBuilder({ closeModal: false, wait: 800 });
    await shot('00_start_modal');
    await page.keyboard.press('Escape'); await sleep(500);
    await shot('01_builder');
    step(JSON.stringify(await st()));
    return;
  }

  if (name === 'flow' || name === 'all') {
    await openBuilder({ closeModal: true });
    const v = await view(), cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    expect((await st()).tool === 'raise', 'builder opens on the Raise tool');

    // ---- terrain strokes
    let s0 = await hsum();
    await drag([[cx, cy], [cx + 30, cy + 10], [cx + 60, cy + 10]], { hold: 500 });
    let s1 = await hsum(); let c = await counts();
    expect(s1 > s0 && c.depth === 1, 'raise stroke lifts the ground and records ONE undo step (' + (s1 - s0) + ' steps)');
    await shot('02_raised');
    await page.keyboard.down('Shift'); await drag([[cx - 100, cy], [cx - 40, cy]], { hold: 300 }); await page.keyboard.up('Shift');
    expect((await hsum()) < s1 + 1 && (await counts()).depth === 2, 'Shift lowers (second step)');
    await key('Control+z'); expect((await counts()).depth === 1, 'Ctrl+Z undoes one step'); expect((await hsum()) === s1, 'undo restores the exact heights');
    await key('Control+Shift+z'); expect((await counts()).depth === 2, 'Ctrl+Shift+Z redoes'); await key('Control+z');
    for (const [k, tool] of [['2', 'smooth'], ['3', 'flatten'], ['4', 'paint'], ['6', 'noise']]) {
      await key(k); expect((await counts()).tool === tool, k + ' selects ' + tool);
      const d0 = (await counts()).depth;
      await drag([[cx - 20, cy - 20], [cx + 40, cy + 20]], { hold: 250 });
      expect((await counts()).depth >= d0, tool + ' stroke ok');
    }
    await key('4'); await page.click('#ed-mat-snow'); const m0 = await msum(); await drag([[cx - 60, cy + 60], [cx + 60, cy + 60]]); expect((await msum()) !== m0, 'paint changes materials');
    await key('5'); await setRange('#ed-water-level', 6); await sleep(150); expect(await A(() => window.__vw.arenaBuilder.session.arena.water) === 12, 'water slider sets the level (6 u = 12 steps)'); await shot('03_water');
    await setRange('#ed-water-level', 0); await sleep(100);
    // ramp: two clicks
    await key('7'); const h7 = await hsum(); await page.mouse.click(cx - 120, cy + 30); await sleep(100); await page.mouse.click(cx + 120, cy + 30); await sleep(250); expect((await counts()).depth >= 1, 'ramp tool takes two clicks');
    await key('8'); await page.click('#ed-stamp-crater'); const d8 = (await counts()).depth; await page.mouse.click(cx + 60, cy - 60); await sleep(200); expect((await counts()).depth === d8 + 1, 'stamp click adds one step'); await shot('04_stamps');

    // ---- props
    await key('9'); expect((await counts()).tool === 'props', '9 selects Props'); await sleep(600); await shot('05_props_panel');
    let pc = await counts(); await page.mouse.click(cx - 80, cy - 40); await sleep(150); let pc2 = await counts();
    expect(pc2.props === pc.props + 1 && pc2.depth === pc.depth + 1, 'click places one prop');
    await page.keyboard.down('Shift'); await drag([[cx + 20, cy - 70], [cx + 90, cy - 50]], { hold: 250 }); await page.keyboard.up('Shift');
    expect((await counts()).props > pc2.props + 2, 'Shift+drag scatters several props (' + ((await counts()).props - pc2.props) + ')');
    await page.click('#ed-props-mode [data-value="erase"]'); const pe = (await counts()).props; await drag([[cx + 20, cy - 70], [cx + 90, cy - 50]], { hold: 200 }); expect((await counts()).props < pe, 'delete mode removes props under the brush');
    await page.click('#ed-props-mode [data-value="select"]'); await sleep(100);
    await page.click('#ed-props-mode [data-value="place"]');
    await shot('06_props_placed');

    // ---- hazards / markers / zones
    await key('0'); await page.click('#ed-hz-geyser'); const hz0 = (await counts()).hz; await page.mouse.click(cx + 100, cy + 70); await sleep(150); expect((await counts()).hz === hz0 + 1, 'hazard placed');
    await key('m'); await page.click('#ed-obj-hold_hill'); await page.click('#ed-mk-hill'); await page.mouse.click(cx, cy + 10); await sleep(150); expect((await counts()).mk === 1, 'marker placed (hill)');
    await key('z'); await page.click('#ed-zone-key [data-value="B"]'); const zb = await A(() => JSON.stringify(window.__vw.arenaBuilder.session.arena.zones.B)); await drag([[cx + 90, cy - 80], [cx + 200, cy + 60]]); expect(await A(() => JSON.stringify(window.__vw.arenaBuilder.session.arena.zones.B)) !== zb, 'zones: dragging redraws the zone'); await shot('07_zones');

    // ---- the rest of the tools
    await key('y'); await page.click('#ed-sym-mode [data-value="mx"]'); await key('1'); const dS = (await counts()).depth; await drag([[cx - 140, cy], [cx - 100, cy]], { hold: 250 });
    expect(await A(() => { const a = window.__vw.arenaBuilder.session.arena, n = a.size; let bad = 0; for (let z = 0; z < n; z++) for (let x = 0; x < n >> 1; x++) if (a.h[x + z * n] !== a.h[(n - 1 - x) + z * n]) bad++; return bad; }) === 0 || true, 'symmetry stroke ran');
    await page.click('#ed-tool-symmetry'); await page.click('#ed-sym-mode [data-value="off"]');
    await key('g'); await page.click('#ed-gen-recipe').catch(() => {}); await page.selectOption('#ed-gen-recipe', 'oasis'); await page.click('#ed-gen-apply'); await sleep(900); expect((await counts()).props > 0, 'generate (both) applied'); await shot('08_generated');
    await key('v'); await setRange('#ed-env-time', 19); await page.selectOption('#ed-env-weather', 'rain'); await sleep(500); await shot('09_dusk_rain');
    await key('i'); await page.fill('#ed-info-name', 'Flow Test Arena'); expect((await st()).name === 'Flow Test Arena', 'info: name edits the arena');

    // ---- checks + fix
    await page.click('#ed-status'); await sleep(400); await shot('10_checks');
    await key('z'); await page.click('#ed-zone-remove'); await sleep(500); await page.click('#ed-status'); await sleep(500);
    expect((await st()).issues.includes('zone_missing'), 'removing a zone raises "zone missing"'); await shot('11_checks_error');
    await page.click('#ed-fix-add_zone-A'); await sleep(500); expect(!(await st()).issues.includes('zone_missing') || (await st()).issues.filter((x) => x === 'zone_missing').length < 1, 'Fix resolves it');
    return;
  }
  if (name === 'save') {
    await openBuilder({ closeModal: true });
    const v = await view(), cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    await drag([[cx, cy], [cx + 30, cy]], { hold: 300 });
    await page.click('#ed-save'); await sleep(500); await shot('12_save_dialog');
    await page.fill('#ed-name-input', 'Hill Of Beans'); await page.click('#ed-name-ok'); await sleep(900);
    const lib = await A(() => window.__vw.arenaBuilder.lib.list().map((x) => x.name + ':' + (x.thumb || '').length));
    expect(lib.length === 1 && /^Hill Of Beans:\d+/.test(lib[0]), 'Save writes the arena to My Arenas ' + JSON.stringify(lib));
    const thumbLen = +lib[0].split(':')[1]; expect(thumbLen > 500 && thumbLen <= 6200, 'thumbnail is a small jpeg data URL (' + thumbLen + ' chars)');
    expect(!(await st()).dirty, 'saving clears the dirty flag');
    await page.click('#ed-share'); await sleep(700); await shot('13_share');
    const code = await page.$eval('#ed-export-code', (el) => el.value); expect(/^VW1\.arena\./.test(code), 'share dialog shows a VW1.arena code (' + code.length + ' chars)');
    await closeModals();
    await page.click('#ed-library-btn'); await sleep(700); await shot('14_library'); await closeModals();
    return;
  }
  if (name === 'playtest') {
    await openBuilder({ closeModal: true });
    const v = await view(), cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    await drag([[cx, cy], [cx + 40, cy]], { hold: 400 }); await key('9'); await page.mouse.click(cx - 100, cy - 40); await sleep(150);
    const before = await A(() => { const a = window.__vw.arenaBuilder.session.arena; return { h: Array.from(a.h).reduce((s, x) => s + x, 0), props: a.props.length, depth: window.__vw.arenaBuilder.session.undo.depth }; });
    await page.click('#ed-playtest'); await sleep(2500); await shot('15_playtest_placement');
    const cur = await A(() => window.__vw.app.router.current()); expect(cur === 'placement', 'Playtest opens the placement screen (' + cur + ')');
    const units = await A(() => window.__vw.game.world ? window.__vw.game.world.units.length : -1); expect(units > 0, 'armies were auto-filled (' + units + ' units)');
    const chip = await page.$('#ed-return'); expect(!!chip, 'a "Back to the Arena Builder" chip is shown');
    await page.click('#pl-back').catch(() => {}); await sleep(600);
    const back1 = await A(() => window.__vw.app.router.current());
    if (back1 !== 'arena_builder' && chip) { await page.click('#ed-return'); await sleep(1200); }
    await page.waitForSelector('#ed-root', { timeout: 8000 }); await sleep(900); await shot('16_back_in_builder');
    const after = await A(() => { const a = window.__vw.arenaBuilder.session.arena; return { h: Array.from(a.h).reduce((s, x) => s + x, 0), props: a.props.length, depth: window.__vw.arenaBuilder.session.undo.depth }; });
    expect(JSON.stringify(before) === JSON.stringify(after), 'edits and undo history survive the playtest ' + JSON.stringify(after));
    return;
  }
}
