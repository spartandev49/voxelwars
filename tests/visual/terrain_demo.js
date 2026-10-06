import { generateArena } from '../../src/world/gen.js';
import { TerrainRenderer } from '../../src/render/terrain.js';
import { VoxelGrid, V, T } from '../../src/voxel/grid.js';
import { ModelDef } from '../../src/voxel/model.js';
import { InstancedModel, newPose } from '../../src/render/instancing.js';
const THREE = window.THREE;
const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(innerWidth, innerHeight); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(r.domElement);
const s = new THREE.Scene(); s.background = new THREE.Color(0x9ec9ec); s.fog = new THREE.Fog(0x9ec9ec, 90, 260);
const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 600); cam.position.set(-34, 26, 34); cam.lookAt(0, 6, 0);
s.add(new THREE.HemisphereLight(0xcfe6ff, 0x6a5a40, 0.75));
const sun = new THREE.DirectionalLight(0xfff0d8, 1.0); sun.position.set(40, 60, 20); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 }); s.add(sun);
const a = generateArena(location.hash.slice(1) || 'nile', 'medium', 4);
const tr = new TerrainRenderer(s); tr.setArena(a); tr.setFog(0x9ec9ec, 90, 260);
// a test soldier: legs/torso/head with team tint
const m = new ModelDef('test', 0.1);
const torso = new VoxelGrid(10, 9, 5).box(0, 0, 0, 10, 9, 5, T(0xffffff)).box(2, 3, 4, 6, 2, 1, V(0xd8b24a));
const head = new VoxelGrid(6, 6, 6).box(0, 0, 0, 6, 6, 6, V(0xe0ac84)).box(0, 4, 0, 6, 2, 6, V(0x9a9aa0)).box(1, 2, 5, 1, 1, 1, V(0x222222)).box(4, 2, 5, 1, 1, 1, V(0x222222));
const leg = new VoxelGrid(4, 9, 4).box(0, 0, 0, 4, 9, 4, V(0xb08050));
m.addPart('torso', torso, { origin: [0, 9, 0], pivot: [5, 0, 2.5] });
m.addPart('head', head, { parent: 'torso', origin: [0, 9, 0], pivot: [3, 0, 3] });
m.addPart('legL', leg, { parent: 'torso', origin: [-2.5, 0, 0], pivot: [2, 9, 2] });
m.addPart('legR', leg, { parent: 'torso', origin: [2.5, 0, 0], pivot: [2, 9, 2] });
const im = new InstancedModel(m, s, { capacity: 8 });
const pose = newPose(m.parts.length);
im.begin();
const teams = [[0.9, 0.2, 0.2], [0.2, 0.4, 0.95]];
for (let i = 0; i < 12; i++) {
  const x = -6 + (i % 6) * 2.2, z = -4 + Math.floor(i / 6) * 2.6, y = a.heightAt(x, z);
  const c = Math.cos(i * 0.4), sn = Math.sin(i * 0.4);
  pose[1 * 9 + 4] = Math.sin(i) * 0.3; // head yaw
  pose[2 * 9 + 3] = Math.sin(i * 1.7) * 0.6; pose[3 * 9 + 3] = -Math.sin(i * 1.7) * 0.6;
  im.add([c, 0, -sn, 0, 0, 1, 0, 0, sn, 0, c, 0, x, y, z, 1], pose, teams[i % 2], i === 3 ? 0.8 : 0);
}
im.end();
r.render(s, cam);
console.log('quads chunks', tr.chunks.size, 'parts', m.parts.length, 'tris', r.info.render.triangles);
