// Instanced rendering of voxel models.
//
// A ModelDef (see voxel/model.js) is a tree of named parts. For every part we keep ONE
// THREE.InstancedMesh shared by all units that use the model, so 600 hoplites cost
// (parts per hoplite) draw calls, not 600 x parts.
//
// Per-instance data: instanceMatrix (mat4), instanceColor (team tint), aFlash (hit flash 0..1).
// Per-vertex data  : color (baked AO + jitter), aFlag (0 normal, 1 team-tinted, 2 emissive).
//
// Part matrices are composed on the CPU straight into the instanceMatrix Float32Array,
// with no per-part object allocation (this runs every frame for every visible unit).

import { meshGrid } from '../voxel/mesher.js';

const THREE = () => window.THREE;

/** Patch a Lambert material for team tint + flash + glow. Shared by units, props, debris. */
export function makeVoxelMaterial(opts = {}) {
  const T = THREE();
  const mat = new T.MeshLambertMaterial({ vertexColors: true });
  mat.userData.voxel = true;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aFlag;
attribute float aFlash;
varying float vFlash;
varying float vGlow;`)
      .replace('#include <color_vertex>', `
#ifdef USE_COLOR
  vColor = color;
  #ifdef USE_INSTANCING_COLOR
    if (aFlag > 0.5 && aFlag < 1.5) vColor *= instanceColor;
  #endif
#endif
vGlow = aFlag > 1.5 ? 1.0 : 0.0;
vFlash = aFlash;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vFlash;
varying float vGlow;`)
      .replace('#include <tonemapping_fragment>', `
gl_FragColor.rgb = mix(gl_FragColor.rgb, diffuseColor.rgb * 1.35, vGlow);
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.93, 0.78), vFlash * 0.8);
#include <tonemapping_fragment>`);
  };
  mat.customProgramCacheKey = () => 'voxel-lambert-v1';
  return mat;
}

let sharedMaterial = null;
export function getVoxelMaterial() { return sharedMaterial || (sharedMaterial = makeVoxelMaterial()); }

/** Build a THREE.BufferGeometry from mesher output. */
export function geometryFromMesh(m) {
  const T = THREE();
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(m.positions, 3));
  g.setAttribute('normal', new T.BufferAttribute(m.normals, 3));
  g.setAttribute('color', new T.BufferAttribute(m.colors, 3));
  g.setAttribute('aFlag', new T.BufferAttribute(m.flags, 1));
  g.setIndex(new T.BufferAttribute(m.indices, 1));
  g.computeBoundingSphere();
  return g;
}

// ---- tiny column-major 4x4 helpers writing into Float32Arrays (no allocation) ----
function composeTRS(out, o, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
  // rotation order: Y * X * Z  (yaw, pitch, roll) which animates naturally for limbs
  const cx = Math.cos(rx), sxn = Math.sin(rx), cy = Math.cos(ry), syn = Math.sin(ry), cz = Math.cos(rz), szn = Math.sin(rz);
  // R = Ry * Rx * Rz
  const r00 = cy * cz + syn * sxn * szn, r01 = -cy * szn + syn * sxn * cz, r02 = syn * cx;
  const r10 = cx * szn, r11 = cx * cz, r12 = -sxn;
  const r20 = -syn * cz + cy * sxn * szn, r21 = syn * szn + cy * sxn * cz, r22 = cy * cx;
  out[o] = r00 * sx; out[o + 1] = r10 * sx; out[o + 2] = r20 * sx; out[o + 3] = 0;
  out[o + 4] = r01 * sy; out[o + 5] = r11 * sy; out[o + 6] = r21 * sy; out[o + 7] = 0;
  out[o + 8] = r02 * sz; out[o + 9] = r12 * sz; out[o + 10] = r22 * sz; out[o + 11] = 0;
  out[o + 12] = tx; out[o + 13] = ty; out[o + 14] = tz; out[o + 15] = 1;
}
function mul(out, o, a, ao, b, bo) {
  for (let c = 0; c < 4; c++) {
    const b0 = b[bo + c * 4], b1 = b[bo + c * 4 + 1], b2 = b[bo + c * 4 + 2], b3 = b[bo + c * 4 + 3];
    out[o + c * 4] = a[ao] * b0 + a[ao + 4] * b1 + a[ao + 8] * b2 + a[ao + 12] * b3;
    out[o + c * 4 + 1] = a[ao + 1] * b0 + a[ao + 5] * b1 + a[ao + 9] * b2 + a[ao + 13] * b3;
    out[o + c * 4 + 2] = a[ao + 2] * b0 + a[ao + 6] * b1 + a[ao + 10] * b2 + a[ao + 14] * b3;
    out[o + c * 4 + 3] = a[ao + 3] * b0 + a[ao + 7] * b1 + a[ao + 11] * b2 + a[ao + 15] * b3;
  }
}

/** Pose layout: 9 floats per part: tx,ty,tz, rx,ry,rz, sx,sy,sz  (offsets are world units, added to the part origin). */
export const POSE_STRIDE = 9;
export function newPose(partCount) {
  const p = new Float32Array(partCount * POSE_STRIDE);
  for (let i = 0; i < partCount; i++) { p[i * 9 + 6] = 1; p[i * 9 + 7] = 1; p[i * 9 + 8] = 1; }
  return p;
}
export function resetPose(p) {
  p.fill(0);
  for (let i = 6; i < p.length; i += 9) { p[i] = 1; p[i + 1] = 1; p[i + 2] = 1; }
}

/**
 * Renders one ModelDef for many units.
 * Usage per frame:  im.begin(); for each unit: im.add(worldMat16, pose, teamColorRGB, flash); im.end();
 */
export class InstancedModel {
  constructor(model, scene, { capacity = 64, castShadow = true, material } = {}) {
    const T = THREE();
    this.model = model;
    this.scene = scene;
    this.capacity = capacity;
    this.count = 0;
    this.material = material || getVoxelMaterial();
    this.meshes = [];
    this.local = new Float32Array(16);
    this.world = new Float32Array(model.parts.length * 16);
    this.geoms = model.parts.map((p) => geometryFromMesh(meshGrid(p.grid, { size: model.voxelSize, pivot: p.pivot })));
    this.flash = null;
    this.castShadow = castShadow;
    this._alloc(capacity);
  }
  _alloc(cap) {
    const T = THREE();
    for (const m of this.meshes) { this.scene.remove(m); m.dispose && m.dispose(); }
    this.capacity = cap;
    this.meshes = this.model.parts.map((p, i) => {
      const geo = this.geoms[i].clone();
      const mesh = new T.InstancedMesh(geo, this.material, cap);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
      mesh.instanceColor.setUsage(T.DynamicDrawUsage);
      const fl = new T.InstancedBufferAttribute(new Float32Array(cap), 1);
      fl.setUsage(T.DynamicDrawUsage);
      geo.setAttribute('aFlash', fl);
      mesh.castShadow = this.castShadow && p.shadow !== false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.userData.partId = p.id;
      this.scene.add(mesh);
      return mesh;
    });
    this.flash = this.meshes[0].geometry.getAttribute('aFlash');
  }
  begin() { this.count = 0; }
  /**
   * @param {Float32Array|number[]} wm  16 floats column-major world matrix of the model root
   * @param {Float32Array} pose         POSE_STRIDE floats per part
   * @param {number[]} team             [r,g,b] 0..1
   * @param {number} flash              0..1
   */
  add(wm, pose, team, flash = 0) {
    if (this.count >= this.capacity) this._alloc(this.capacity * 2);
    const i = this.count++;
    const parts = this.model.parts, W = this.world, L = this.local;
    for (let p = 0; p < parts.length; p++) {
      const part = parts[p], o = p * 9;
      composeTRS(L, 0, part.origin[0] + pose[o], part.origin[1] + pose[o + 1], part.origin[2] + pose[o + 2], pose[o + 3], pose[o + 4], pose[o + 5], pose[o + 6], pose[o + 7], pose[o + 8]);
      if (part.parentIndex < 0) mul(W, p * 16, wm, 0, L, 0);
      else mul(W, p * 16, W, part.parentIndex * 16, L, 0);
      const mesh = this.meshes[p];
      const arr = mesh.instanceMatrix.array;
      const base = i * 16;
      for (let k = 0; k < 16; k++) arr[base + k] = W[p * 16 + k];
      const ca = mesh.instanceColor.array;
      ca[i * 3] = team[0]; ca[i * 3 + 1] = team[1]; ca[i * 3 + 2] = team[2];
    }
    // flash attr is shared (same array reference) only per mesh geometry, so write to each
    for (let p = 0; p < this.meshes.length; p++) this.meshes[p].geometry.getAttribute('aFlash').array[i] = flash;
    return i;
  }
  /** World matrix (16 floats, column-major) of part index p for the most recently added unit. */
  partMatrix(p) { return this.world.subarray(p * 16, p * 16 + 16); }
  end() {
    for (const m of this.meshes) {
      m.count = this.count;
      m.visible = this.count > 0;
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
      m.geometry.getAttribute('aFlash').needsUpdate = true;
    }
  }
  dispose() {
    for (const m of this.meshes) { this.scene.remove(m); m.geometry.dispose(); }
    this.meshes = [];
  }
}

export { composeTRS, mul as mat4mul };
