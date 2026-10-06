// tools/shot_uib.mjs: screenshot driver for the battle-side UI (HUD + battle screens). Output: docs/sheets/uib_<scene>_<WxH>.png
// Usage: node tools/shot_uib.mjs [scene ...] [--sizes=1280x720,1920x1080,820x1180,390x844] [--out=docs/sheets]
//   no scene = all scenes. Scenes are defined below as small async functions driving window.__ui inside the page.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launch, open, bundleHarness } from '../tests/ui_battle/_page.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const sizes = ((args.find((a) => a.startsWith('--sizes=')) || '').slice(8) || '1280x720,1920x1080,820x1180,390x844').split(',').map((s) => s.split('x').map(Number));
const outDir = path.join(root, (args.find((a) => a.startsWith('--out=')) || '').slice(6) || 'docs/sheets');
const want = args.filter((a) => !a.startsWith('--'));
fs.mkdirSync(outDir, { recursive: true });

/** Each scene: { name, opts (passed to __ui.setup, may include touch), run: async (page) => void } ; the screenshot is taken after run(). */
const BATTLE = `__ui.setup({ seed: 5 }); __ui.router.goto('battle'); __ui.mock.game.select(2);`;
export const SCENES = [
  { name: 'hud', desc: 'battle HUD parts only, running battle, a unit selected', run: async (p) => { await p.evaluate(() => { __ui.setup({ seed: 5 }); __ui.mountHudOnly(); __ui.mock.game.select(2); __ui.step(40); }); } },
  { name: 'battle', desc: 'battle screen (HUD + announcer typing)', wait: 2600, run: async (p) => { await p.evaluate(`${BATTLE} __ui.step(14);`); } },
  { name: 'battle_idle', desc: 'battle screen, nothing selected, early battle', wait: 900, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 8 }); __ui.router.goto('battle'); __ui.step(3);`); } },
  { name: 'hud_types', desc: 'unit counts open', run: async (p) => { await p.evaluate(`${BATTLE} __ui.step(20); __ui.router.base.inst.hud.modules.typecounts.toggle(); __ui.step(1);`); } },
  { name: 'hud_aim', desc: 'god power armed (aim mode)', run: async (p) => { await p.evaluate(`${BATTLE} __ui.step(20); __ui.router.base.inst.hud.modules.powers.activate(1); __ui.step(1);`); } },
  { name: 'hud_help', desc: 'controls overlay (H)', run: async (p) => { await p.evaluate(`${BATTLE} __ui.step(10); __ui.router.base.inst.hud.modules.help.show(true);`); } },
  { name: 'hud_hidden', desc: 'HUD hidden with Tab (chip visible)', wait: 300, run: async (p) => { await p.evaluate(`${BATTLE} __ui.step(10); __ui.router.base.inst.hud.hide(true);`); } },
  { name: 'hud_photo', desc: 'photo mode toolbar', run: async (p) => { await p.evaluate(`${BATTLE} __ui.step(10); __ui.mock.game.camMode = 'photo'; __ui.step(1);`); } },
  { name: 'hud_command', desc: 'Take Command overlay (touch joystick + ability buttons)', touch: true, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5, touch: true }); __ui.router.goto('battle'); __ui.mock.game.select(2); __ui.step(10); __ui.mock.game.possessId = 2; __ui.step(1);`); } },
  { name: 'hud_teaching', desc: 'mission-1 teaching beat pointing at the god powers', run: async (p) => { await p.evaluate(`${BATTLE} __ui.mock.game.teaching = { id: 'power', index: 2, total: 5, title: 'Smite something', text: 'Press 1, then click the arena: Zeus will do the rest. Zeus is a professional.', target: 'powers', who: 'brutus', canSkip: true }; __ui.step(10);`); await p.waitForTimeout(300); } },
  { name: 'hud_bubbles', desc: 'speech bubbles + combat tags', run: async (p) => { await p.evaluate(`${BATTLE} __ui.mock.game.battle; const W = innerWidth, H = innerHeight; window.__labels = { bubbles: [ {id:1,text:'Tell my shield I loved it.',x:W*0.3,y:H*0.62,kind:'death'}, {id:2,text:'Forward! Mostly.',x:W*0.4,y:H*0.7,kind:'bark'}, {id:3,text:'Zzz...',x:W*0.66,y:H*0.62,kind:'zzz'}, {id:4,text:'What is a sword, really?',x:W*0.55,y:H*0.76,kind:'thought'}, {id:5,text:'FOR THE GOAT!',x:W*0.72,y:H*0.68,kind:'hero'} ], tags: [ {id:'a',kind:'crit',x:W*0.35,y:H*0.5}, {id:'b',kind:'blocked',x:W*0.62,y:H*0.52}, {id:'c',kind:'brace',x:W*0.5,y:H*0.58} ] }; __ui.mock.game.hud0 = __ui.mock.game.hud; __ui.mock.game.hud = function () { const d = __ui.mock.game.hud0(); d.worldLabels = window.__labels; return d; }; __ui.step(5); `); await p.waitForTimeout(250); } },
  { name: 'countdown_3', desc: 'countdown overlay: 3', wait: 500, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('battle'); __ui.mock.game.fight(); __ui.router.overlay('countdown');`); } },
  { name: 'countdown_fight', desc: 'FIGHT! beat (horn)', wait: 420, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('battle'); __ui.mock.game.fight(); __ui.step(2.9); __ui.step(0.3);`); } },
  { name: 'pause', desc: 'pause overlay', run: async (p) => { await p.evaluate(`${BATTLE} __ui.step(10); __ui.mock.game.pause(true); __ui.router.overlay('pause');`); } },
  { name: 'controls', desc: 'controls reference overlay', run: async (p) => { await p.evaluate(`${BATTLE} __ui.step(5); __ui.router.overlay('controls');`); } },
  { name: 'results_win', desc: 'results: victory (quick battle)', wait: 1500, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5, resultsKind: 'quick', winner: 0 }); __ui.router.goto('battle'); __ui.step(5); __ui.router.overlay('results');`); } },
  { name: 'results_lose', desc: 'results: defeat', wait: 1500, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5, resultsKind: 'quick', winner: 1 }); __ui.router.goto('battle'); __ui.step(5); __ui.router.overlay('results');`); } },
  { name: 'results_mission', desc: 'results: campaign mission with stars + rewards', wait: 1800, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5, resultsKind: 'campaign', winner: 0 }); __ui.router.goto('battle'); __ui.step(5); __ui.router.overlay('results');`); } },
  { name: 'results_survival', desc: 'results: survival score + leaderboard', wait: 1500, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5, resultsKind: 'survival', winner: 1 }); __ui.router.goto('battle'); __ui.step(5); __ui.router.overlay('results');`); } },
  { name: 'results_daily', desc: 'results: daily skirmish with copyable string', wait: 1500, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5, resultsKind: 'daily', winner: 0 }); __ui.router.goto('battle'); __ui.step(5); __ui.router.overlay('results');`); } },
  { name: 'campaign', desc: 'campaign map', wait: 900, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('campaign');`); } },
  { name: 'campaign_hover', desc: 'campaign map with a pin card open', wait: 700, run: async (p, c) => { await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('campaign');`); if (c.w >= 900) await p.hover('#pin-thermopylae_snack'); } },
  { name: 'briefing', desc: 'mission briefing over the campaign map', wait: 1300, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('campaign'); __ui.router.overlay('briefing', { mission: 'pyramid_scheme' });`); } },
  { name: 'survival_setup', desc: 'survival setup', wait: 900, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('survival', { view: 'setup' });`); } },
  { name: 'survival_inter', desc: 'survival intermission over the placement view', wait: 700, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('battle'); __ui.mock.game.state = 'placement'; __ui.router.overlay('survival', { view: 'intermission', survival: { wave: 3, waveName: 'Wave 3: The Tax Collectors', nextName: 'Wave 4: Slightly Cross Cavalry', nextStyle: 'Rush', boss: false, faction: 'hellenes' } });`); } },
  { name: 'daily', desc: 'daily skirmish screen', wait: 900, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('daily');`); } },
  { name: 'puzzles', desc: 'puzzle challenges: six cards + side panel (wide) / list (narrow)', wait: 900, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('campaign'); __ui.router.goto('puzzles');`); } },
  { name: 'puzzles_hint', desc: 'puzzles: a card selected with its hint open', wait: 700, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('puzzles');`); await p.waitForTimeout(500); await p.click('#pz-pick-elephant_room'); await p.waitForTimeout(150); await p.click('#pz-hint-btn'); } },
  { name: 'puzzles_empty', desc: 'puzzles: no data / one broken puzzle / storage blocked', wait: 700, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5, puzzles: [{ id: 'spear_wall', title: 'Please Hold Still', kind: 'puzzle' }, { id: 'ok_one', title: 'Fine One', blurb: 'One hoplite line. One decision.', arena: { recipe: 'marathon', size: 'medium', seed: 1 }, player: { roster: ['hoplite', 'peltast'], budget: 1000 }, par: 700, goal: { type: 'eliminate' }, enemy: { placements: [] } }] }); __ui.mock.ctx.save.status = () => 'memory'; __ui.router.goto('puzzles');`); } },
  { name: 'briefing_puzzle', desc: 'puzzle briefing: goal, par, roster, fixed rules', wait: 1300, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5 }); __ui.router.goto('puzzles'); __ui.router.overlay('briefing', { puzzle: 'knock_knock' });`); } },
  { name: 'results_puzzle', desc: 'results: puzzle with stars, Retry / Next puzzle', wait: 1500, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5, resultsKind: 'puzzle', winner: 0 }); __ui.router.goto('battle'); __ui.step(5); __ui.router.overlay('results');`); } },
  { name: 'reduced_results', desc: 'results with Reduce Motion', reduced: true, wait: 600, run: async (p) => { await p.evaluate(`__ui.setup({ seed: 5, resultsKind: 'campaign', winner: 0, settings: { reduceMotion: true } }); __ui.router.goto('battle'); __ui.step(5); __ui.router.overlay('results');`); } },
];

const browser = await launch();
const js = await bundleHarness();
let n = 0, bad = 0;
for (const sc of SCENES) {
  if (want.length && !want.includes(sc.name)) continue;
  for (const [w, h] of sizes) {
    const touch = !!sc.touch || w < 700;
    const { page, logs, close } = await open(browser, { width: w, height: h, touch, js, reducedMotion: !!sc.reduced });
    try {
      await page.evaluate((o) => { window.__sceneOpts = o; }, sc.opts || {});
      await sc.run(page, { w, h });
      await page.waitForTimeout(sc.wait || 450);
      const file = path.join(outDir, `uib_${sc.name}_${w}x${h}.png`);
      await page.screenshot({ path: file });
      n++;
    } catch (e) { bad++; console.log('FAIL', sc.name, w + 'x' + h, e.message.split('\n')[0]); }
    if (logs.length) { console.log(sc.name, w + 'x' + h, 'console:', logs.slice(0, 4).join(' | ')); }
    await close();
  }
}
await browser.close();
console.log(`shots: ${n} written to ${path.relative(root, outDir)}${bad ? `, ${bad} failed` : ''}`);
process.exit(bad ? 1 : 0);
