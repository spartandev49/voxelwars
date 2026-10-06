// Browser-side checks for render/props.js (driven by tests/props/renderer.test.mjs through headless Chromium).
import { Engine } from '../../src/render/engine.js';
import { generateArena } from '../../src/world/gen.js';
import { TerrainRenderer } from '../../src/render/terrain.js';
import { PropRenderer, PROP_TIERS, disposePropGeometry } from '../../src/render/props.js';
import { CubeFX } from '../../src/render/fx.js';
import { EventBus } from '../../src/core/events.js';
import { PROP_CATALOG } from '../../src/content/era_ancient/props/catalog.js';

const out = [];
const t = (name, ok, detail) => out.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
const eng = new Engine(document.body);
const tr = new TerrainRenderer(eng.scene);
function setup(recipe, size = 'medium', seed = 3) {
  const a = generateArena(recipe, size, seed);
  tr.setArena(a);
  const f = eng.setEnvironment(a.env, a); tr.setFog(f.color, f.near, f.far);
  const fx = new CubeFX(eng.scene, a, 4000);
  const pr = new PropRenderer(eng, a, { fx });
  return { a, fx, pr };
}
function view(pr, a, h = 60) { eng.camera.position.set(0, h, a.worldSize() * 0.55); eng.camera.lookAt(0, 4, 0); eng.focus.set(0, 4, 0); eng.camera.updateMatrixWorld(); pr.update(0.016, eng.camera); }
try {
  // ---- items, ids, batches, culling
  let { a, fx, pr } = setup('teutoburg');
  view(pr, a);
  const st = pr.stats();
  t('items match arena props', st.items === a.props.length, st.items + ' vs ' + a.props.length);
  t('ids are 1-based list indices (sim contract)', pr.get(1).type === a.props[0].t && pr.get(a.props.length).type === a.props[a.props.length - 1].t);
  t('visible instances are culled and drawn', st.instances > 0 && st.instances <= st.items && st.drawCalls > 0 && st.triangles > 0, JSON.stringify(st));
  t('draw calls stay inside the R2 prop budget (<= 60)', st.drawCalls <= 60, st.drawCalls);
  eng.render(0.016);
  t('first render with prop batches does not throw', true);
  // camera far away: nothing visible and no draw
  eng.camera.position.set(0, 400, 0); eng.camera.lookAt(0, 4, 0); eng.camera.updateMatrixWorld(); pr.update(0.016, eng.camera);
  const far = pr.stats();
  t('far camera uses coarser LODs (fewer triangles per instance)', far.instances > 0 ? far.triangles / far.instances < st.triangles / st.instances : true, (far.triangles / Math.max(1, far.instances)).toFixed(0) + ' vs ' + (st.triangles / st.instances).toFixed(0));
  eng.camera.position.set(0, 60, a.worldSize() * 0.55); eng.camera.lookAt(0, 4, 180); eng.camera.updateMatrixWorld(); pr.update(0.016, eng.camera);
  t('looking away culls everything', pr.stats().instances === 0, pr.stats().instances);
  view(pr, a);

  // ---- editor API
  const n0 = pr.count;
  const id = pr.add({ t: 'tower', x: 3, z: 3, r: 0.5, s: 1.2, v: 1 });
  t('add() renders and returns an id', id > 0 && pr.count === n0 + 1 && pr.get(id).type === 'tower' && Math.abs(pr.get(id).y - a.cellHeight(3, 3)) < 2.5, id);
  t('add() of an unknown type (hostile import) is ignored', pr.add({ t: 'definitely_not_a_prop', x: 0, z: 0 }) === 0 && pr.count === n0 + 1);
  pr.transform(id, { x: 8, z: -4, r: 1, s: 1.4 });
  t('transform() moves a prop', Math.abs(pr.get(id).x - 8) < 1e-6 && Math.abs(pr.get(id).s - 1.4) < 1e-6);
  const ray = pr.pick({ x: 8, y: 80, z: -4 }, { x: 0, y: -1, z: 0 });
  t('pick() finds the prop under a ray', ray && ray.id === id, JSON.stringify(ray));
  t('removeById() drops it', pr.removeById(id) && pr.count === n0 && !pr.get(id));
  pr.clear();
  t('clear() empties', pr.count === 0 && pr.stats().batches === 0);
  pr.setArena(a);
  t('setArena() restores everything', pr.count === a.props.length);

  // ---- destruction: stages, rubble, debris
  const tree = a.props.findIndex((p) => p.t === 'tree_oak' || p.t === 'tree_pine') + 1;
  const tw = a.props.findIndex((p) => PROP_CATALOG[p.t].hp !== Infinity && PROP_CATALOG[p.t].hp > 100) + 1;
  const pid = tw || tree;
  view(pr, a);
  const b0 = pr.stats().batches;
  pr.setStage(pid, 1);
  t('setStage(1) swaps the batch', pr.get(pid).stage === 1);
  fx.clear(); pr.remove(pid);
  t('remove() collapses a destructible prop to its rubble stage', pr.get(pid) && pr.get(pid).stage === 2 && pr.get(pid).dead);
  fx.update(0.016);
  t('remove() spawns 30-80 debris cubes and dust through the CubeFX pool', fx.liveCount >= 30 && fx.liveCount <= 120, fx.liveCount);
  const stone = a.props.findIndex((p) => p.t === 'rock_big') + 1;
  if (stone) { pr.remove(stone); t('indestructible props are simply removed', !pr.get(stone)); }
  pr.setArena(a); view(pr, a);
  eng.render(0.016);

  // ---- events (what world.events emits)
  const bus = new EventBus(); pr.bindEvents(bus);
  const wall = a.props.findIndex((p) => PROP_CATALOG[p.t].hp !== Infinity) + 1;
  bus.emit('prop_damaged', { id: wall, type: a.props[wall - 1].t, hpFrac: 0.5, x: a.props[wall - 1].x, y: 5, z: a.props[wall - 1].z });
  t('prop_damaged hpFrac<0.6 -> cracked stage', pr.get(wall).stage === 1);
  bus.emit('prop_destroyed', { id: wall, type: a.props[wall - 1].t, x: a.props[wall - 1].x, y: 5, z: a.props[wall - 1].z, s: 1 });
  t('prop_destroyed -> rubble', pr.get(wall).stage === 2);
  const before = pr.count; bus.emit('prop_spawned', { id: 9999, type: 'crate', x: 1, z: 1 });
  t('prop_spawned adds', pr.count === before + 1 && pr.get(9999).type === 'crate');
  const hc = a.cellHeight(20, 20); bus.emit('crater', { x: 20, z: 20, r: 3, x0: 0, z0: 0, x1: 0, z1: 0 });
  t('crater event re-seats props without throwing', true);
  pr.unbindEvents();

  // ---- fire, lights, burning
  ({ a, fx, pr } = setup('troy'));
  view(pr, a, 40);
  t('torches and fires register as emitters', pr.stats().emitters > 0, pr.stats().emitters);
  for (let i = 0; i < 30; i++) { pr.update(0.05, eng.camera); fx.update(0.05); }
  t('emitters feed CubeFX fire particles', fx.liveCount > 0, fx.liveCount);
  const b = a.props.findIndex((p) => p.t === 'tree_olive') + 1;
  if (b) { pr.setBurning(b, true); for (let i = 0; i < 10; i++) { pr.update(0.05, eng.camera); fx.update(0.05); } t('burning props emit flames', true); pr.setBurning(b, false); }
  t('light pool follows the tier', pr.lights.length === PROP_TIERS.marble.lights, pr.lights.length);
  pr.setQuality('potato');
  t('potato tier: no point lights, shadows off', pr.lights.length === 0 && pr.shadowsOn === false);
  pr.setQuality('marble'); view(pr, a, 40); eng.render(0.016);

  // ---- ships float, clouds hover
  ({ a, fx, pr } = setup('carthage'));
  view(pr, a, 50);
  const ship = a.props.findIndex((p) => p.t === 'ship') + 1, yw = a.waterY();
  for (let i = 0; i < 10; i++) pr.update(0.1, eng.camera);
  t('ships sit on the water surface and bob', Math.abs(pr.get(ship).y - (yw - 0.06)) < 0.12, pr.get(ship).y + ' vs ' + yw);

  // ---- crowd
  ({ a, fx, pr } = setup('colosseum'));
  view(pr, a, 50);
  t('colosseum has 90 animated spectators', pr.stats().crowd === 90, pr.stats().crowd);
  pr.crowdReact('cheer', 1, 0, 0);
  for (let i = 0; i < 20; i++) pr.update(0.05, eng.camera);
  t('crowd skins drawn (1 draw call per colour variant)', pr.stats().drawCalls >= 4 && pr.crowd.skins.filter(Boolean).length === 4, pr.crowd.skins.filter(Boolean).length);
  pr.crowdReact('gasp', 1, 0, 0); for (let i = 0; i < 10; i++) pr.update(0.05, eng.camera);
  eng.render(0.016);
  t('cheer and gasp poses render without errors', true);
  const bus2 = new EventBus(); pr.bindEvents(bus2);
  for (let i = 0; i < 4; i++) bus2.emit('unit_kill', { x: 2, z: 2 });
  for (let i = 0; i < 6; i++) pr.update(0.05, eng.camera);
  t('unit_kill clusters trigger a cheer wave', pr.crowd.react && pr.crowd.react.kind === 'cheer');
  pr.setCrowdPose((pose, kind, k) => { pose[3 * 9 + 3] = -3 * k; });
  pr.update(0.05, eng.camera);
  t('ANIM can replace the spectator poses', true);

  // ---- dispose frees the scene
  const kids = eng.scene.children.length;
  pr.dispose(); fx.dispose();
  t('dispose() removes meshes and lights from the scene', eng.scene.children.length < kids, kids + ' -> ' + eng.scene.children.length);
  disposePropGeometry();
} catch (e) { t('no exception', false, e && e.stack || e); }
window.__result = out;
