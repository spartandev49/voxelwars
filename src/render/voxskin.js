// VoxSkin: renders ONE ModelDef for many units with ONE draw call (plus one for the shadow pass).
//
//  * All parts of the model are meshed into a single merged BufferGeometry; each vertex carries `aPart`.
//  * Per-instance part transforms (3x4 affine, rows) live in a RGBA32F DataTexture: texel (3*part + k, instance) = row k.
//    The vertex shader fetches them with texelFetch (WebGL2) and skins the vertex, then three's normal
//    instancing applies the unit's world matrix (instanceMatrix).
//  * Per-instance attributes: instanceColor (team tint rgb, linear), aFx (flash, stone, glow, texture row).
//  * Optional far LOD ({lod:true}): a second InstancedMesh with half-resolution part geometry (~1/4 of the triangles, no shadow) sharing the same
//    material and texture; add(..., lod=1) puts a unit there. Rows are handed out by one counter, so both meshes address the same texture.
//  * Shadows use a matching customDepthMaterial so shadows follow the posed model.
//
// CPU work per instance: compose the part chain from a pose array (POSE_STRIDE floats per part) straight into the
// texture's Float32Array, no allocations.

import { meshGrid } from '../voxel/mesher.js';
import { downsample2, lodPivot } from '../voxel/lod.js';

const T = () => window.THREE;
export const POSE_STRIDE = 9; // tx,ty,tz, rx,ry,rz, sx,sy,sz

export function newPose(partCount) {
  const p = new Float32Array(partCount * POSE_STRIDE);
  resetPose(p);
  return p;
}
export function resetPose(p) {
  p.fill(0);
  for (let i = 6; i < p.length; i += POSE_STRIDE) { p[i] = 1; p[i + 1] = 1; p[i + 2] = 1; }
}

// ---------- shader patch ----------
const FETCH = `
  int vsPart = int(aPart + 0.5);
  ivec2 vsBase = ivec2(vsPart * 3, int(aFx.w + 0.5));     // aFx.w = this instance's row in the part texture (near and far meshes share one texture)
  vec4 vsR0 = texelFetch(uPartTex, vsBase, 0);
  vec4 vsR1 = texelFetch(uPartTex, vsBase + ivec2(1, 0), 0);
  vec4 vsR2 = texelFetch(uPartTex, vsBase + ivec2(2, 0), 0);
`;
function patchVertex(shader, tex) {
  shader.uniforms.uPartTex = { value: tex };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
uniform highp sampler2D uPartTex;
attribute float aPart;
attribute vec4 aFx;
varying vec4 vFx;
varying float vGlow;
attribute float aFlag;`)
    .replace('void main() {', `void main() {${FETCH}`)
    .replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3(dot(vsR0.xyz, normal), dot(vsR1.xyz, normal), dot(vsR2.xyz, normal));
#ifdef USE_TANGENT
  vec3 objectTangent = vec3( tangent.xyz );
#endif`)
    .replace('#include <begin_vertex>', `vec3 transformed = vec3(dot(vsR0.xyz, position) + vsR0.w, dot(vsR1.xyz, position) + vsR1.w, dot(vsR2.xyz, position) + vsR2.w);`);
  return shader;
}

export function makeSkinMaterial(tex) {
  const mat = new (T().MeshLambertMaterial)({ vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    patchVertex(shader, tex);
    shader.vertexShader = shader.vertexShader.replace('#include <color_vertex>', `
#ifdef USE_COLOR
  vColor = color;
  #ifdef USE_INSTANCING_COLOR
    if (aFlag > 0.5 && aFlag < 1.5) vColor *= instanceColor;
  #endif
#endif
vGlow = aFlag > 1.5 ? 1.0 : 0.0;
vFx = aFx;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vFx;
varying float vGlow;`)
      .replace('#include <tonemapping_fragment>', `
  float vsLum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(vsLum * 0.85 + 0.08), vFx.y);                 // stone
  gl_FragColor.rgb = mix(gl_FragColor.rgb, diffuseColor.rgb * (1.35 + vFx.z), vGlow * (1.0 - vFx.y));   // glow voxels
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.93, 0.78), vFx.x * 0.8);                // hit flash
#include <tonemapping_fragment>`);
  };
  mat.customProgramCacheKey = () => 'voxskin-lambert-v1';
  return mat;
}

export function makeSkinDepthMaterial(tex) {
  const mat = new (T().MeshDepthMaterial)({ depthPacking: T().RGBADepthPacking });
  mat.onBeforeCompile = (shader) => {
    patchVertex(shader, tex);
    // depth shader has no aFlag/aFx use; the declarations are harmless
    shader.vertexShader = shader.vertexShader.replace('varying vec4 vFx;', '').replace('varying float vGlow;', '');
  };
  mat.customProgramCacheKey = () => 'voxskin-depth-v1';
  return mat;
}

// ---------- 3x4 affine helpers (row-major, 12 floats) ----------
const _rest = new Float32Array(9);
function restMatrix(rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return [cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx, cx * sz, cx * cz, -sx, -sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx];
}

/** spec §2/§4: composed models may carry up to 48 parts (part texture is 3 texels per part, 144 texels wide). */
export const MAX_PARTS = 48;

export class VoxSkin {
  /**
   * @param {{scene:any}} host  object with a THREE.Scene at .scene
   * @param {import('../voxel/model.js').ModelDef} model
   */
  constructor(host, model, { capacity = 32, shadow = true, lod = false } = {}) {
    const THREE = T();
    this.host = host; this.model = model;
    this.parts = model.parts;
    this.P = this.parts.length;
    if (this.P > MAX_PARTS) throw new Error(`model ${model.id} has ${this.P} parts (max ${MAX_PARTS})`);
    this.shadow = shadow; this.lod = !!lod;
    this.count = 0; this.nNear = 0; this.nFar = 0;
    this.capacity = 0;
    this.restM = this.parts.map((p) => (p.rest[0] || p.rest[1] || p.rest[2]) ? restMatrix(p.rest[0], p.rest[1], p.rest[2]) : null);
    this.W = new Float32Array(this.P * 12);   // scratch: part world (root-relative) 3x4 per part
    this.geometry = this._buildGeometry(false);
    this.geometryFar = this.lod ? this._buildGeometry(true) : null;
    this.mesh = null; this.far = null;
    this._alloc(capacity);
  }
  _buildGeometry(far) {
    const THREE = T(), m = this.model;
    const metas = this.parts.map((p) => (far ? meshGrid(downsample2(p.grid), { size: m.voxelSize * 2, pivot: lodPivot(p.pivot) }) : meshGrid(p.grid, { size: m.voxelSize, pivot: p.pivot })));
    let nv = 0, ni = 0;
    for (const x of metas) { nv += x.vertexCount; ni += x.indices.length; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), flag = new Float32Array(nv), part = new Float32Array(nv), idx = new Uint32Array(ni);
    let vo = 0, io = 0;
    metas.forEach((x, pi) => {
      pos.set(x.positions, vo * 3); nor.set(x.normals, vo * 3); col.set(x.colors, vo * 3); flag.set(x.flags, vo);
      part.fill(pi, vo, vo + x.vertexCount);
      for (let i = 0; i < x.indices.length; i++) idx[io + i] = x.indices[i] + vo;
      vo += x.vertexCount; io += x.indices.length;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aFlag', new THREE.BufferAttribute(flag, 1));
    g.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.2, 0), 6);
    if (far) this.trianglesFar = ni / 3; else this.triangles = ni / 3;
    return g;
  }
  _makeMesh(geometry, cap, shadow) {
    const THREE = T();
    const geo = geometry.clone();
    geo.boundingSphere = geometry.boundingSphere.clone();
    const fxArr = new Float32Array(cap * 4);
    const fxAttr = new THREE.InstancedBufferAttribute(fxArr, 4); fxAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aFx', fxAttr);
    const mesh = new THREE.InstancedMesh(geo, this.material, cap);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = shadow; mesh.receiveShadow = false;
    if (shadow) mesh.customDepthMaterial = this.depthMaterial;
    mesh.count = 0;
    mesh.userData.model = this.model.id;
    return { mesh, fxArr, fxAttr };
  }
  _alloc(cap) {
    const THREE = T();
    cap = Math.max(4, cap);
    const old = this.mesh, oldFar = this.far;
    const oldTex = this.tex;
    this.capacity = cap;
    // texture: width = 3 texels per part, height = rows (one row per instance of either mesh)
    this.texData = new Float32Array(this.P * 3 * cap * 4);
    this.tex = new THREE.DataTexture(this.texData, this.P * 3, cap, THREE.RGBAFormat, THREE.FloatType);
    this.tex.minFilter = THREE.NearestFilter; this.tex.magFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false; this.tex.flipY = false; this.tex.needsUpdate = true;
    if (this.material) { this.material.dispose(); if (this.depthMaterial) this.depthMaterial.dispose(); }
    this.material = makeSkinMaterial(this.tex);
    this.depthMaterial = this.shadow ? makeSkinDepthMaterial(this.tex) : null;
    const near = this._makeMesh(this.geometry, cap, this.shadow);
    this.mesh = near.mesh; this.fxArr = near.fxArr; this.fxAttr = near.fxAttr;
    const oldLoc = this.loc; this.loc = new Int32Array(cap);
    if (oldLoc) this.loc.set(oldLoc.subarray(0, Math.min(oldLoc.length, cap)));
    if (this.geometryFar) { const f = this._makeMesh(this.geometryFar, cap, false); this.far = f.mesh; this.fxArrF = f.fxArr; this.fxAttrF = f.fxAttr; }
    if (old) { // carry existing data across a growth
      this.mesh.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, Math.min(old.instanceMatrix.array.length, this.mesh.instanceMatrix.array.length)));
      this.host.scene.remove(old); old.geometry.dispose(); if (oldTex) oldTex.dispose();
    }
    if (oldFar) { this.far.instanceMatrix.array.set(oldFar.instanceMatrix.array.subarray(0, Math.min(oldFar.instanceMatrix.array.length, this.far.instanceMatrix.array.length))); this.host.scene.remove(oldFar); oldFar.geometry.dispose(); }
    this.host.scene.add(this.mesh); if (this.far) this.host.scene.add(this.far);
  }
  begin() { this.count = 0; this.nNear = 0; this.nFar = 0; }

  /**
   * Add a unit. Root transform = translation (x,y,z), yaw `h`, optional pitch/roll tilt (for flying corpses), non-uniform scale.
   * @param {Float32Array} pose POSE_STRIDE floats per part, model part order
   * @param {number[]} team [r,g,b] linear 0..1
   */
  add(x, y, z, h, sx, sy, sz, pose, team, flash = 0, stone = 0, glow = 0, pitch = 0, roll = 0, lod = 0) {
    if (this.count >= this.capacity) this._grow();
    const far = lod && this.far ? 1 : 0;
    const i = this.count++, j = far ? this.nFar++ : this.nNear++, P = this.P, parts = this.parts, W = this.W, td = this.texData;
    this.loc[i] = far ? ~j : j;
    const M = far ? this.far : this.mesh;
    // ----- root matrix into instanceMatrix (column-major 4x4) -----
    const ch = Math.cos(h), sh = Math.sin(h);
    const im = M.instanceMatrix.array, o = j * 16;
    if (pitch === 0 && roll === 0) {
      im[o] = ch * sx; im[o + 1] = 0; im[o + 2] = -sh * sx; im[o + 3] = 0;
      im[o + 4] = 0; im[o + 5] = sy; im[o + 6] = 0; im[o + 7] = 0;
      im[o + 8] = sh * sz; im[o + 9] = 0; im[o + 10] = ch * sz; im[o + 11] = 0;
    } else {
      // R = Ry(h) * Rx(pitch) * Rz(roll)
      const cx = Math.cos(pitch), sxn = Math.sin(pitch), cz = Math.cos(roll), szn = Math.sin(roll);
      const r00 = ch * cz + sh * sxn * szn, r01 = -ch * szn + sh * sxn * cz, r02 = sh * cx;
      const r10 = cx * szn, r11 = cx * cz, r12 = -sxn;
      const r20 = -sh * cz + ch * sxn * szn, r21 = sh * szn + ch * sxn * cz, r22 = ch * cx;
      im[o] = r00 * sx; im[o + 1] = r10 * sx; im[o + 2] = r20 * sx; im[o + 3] = 0;
      im[o + 4] = r01 * sy; im[o + 5] = r11 * sy; im[o + 6] = r21 * sy; im[o + 7] = 0;
      im[o + 8] = r02 * sz; im[o + 9] = r12 * sz; im[o + 10] = r22 * sz; im[o + 11] = 0;
    }
    im[o + 12] = x; im[o + 13] = y; im[o + 14] = z; im[o + 15] = 1;
    // ----- part chain -----
    const rowBase = i * P * 12;
    for (let p = 0; p < P; p++) {
      const part = parts[p], q = p * POSE_STRIDE, w = p * 12;
      const rx = pose[q + 3], ry = pose[q + 4], rz = pose[q + 5];
      const cx = Math.cos(rx), sxn = Math.sin(rx), cy = Math.cos(ry), syn = Math.sin(ry), cz = Math.cos(rz), szn = Math.sin(rz);
      let a00 = cy * cz + syn * sxn * szn, a01 = -cy * szn + syn * sxn * cz, a02 = syn * cx;
      let a10 = cx * szn, a11 = cx * cz, a12 = -sxn;
      let a20 = -syn * cz + cy * sxn * szn, a21 = syn * szn + cy * sxn * cz, a22 = cy * cx;
      const rm = this.restM[p];
      if (rm) {
        const b00 = a00 * rm[0] + a01 * rm[3] + a02 * rm[6], b01 = a00 * rm[1] + a01 * rm[4] + a02 * rm[7], b02 = a00 * rm[2] + a01 * rm[5] + a02 * rm[8];
        const b10 = a10 * rm[0] + a11 * rm[3] + a12 * rm[6], b11 = a10 * rm[1] + a11 * rm[4] + a12 * rm[7], b12 = a10 * rm[2] + a11 * rm[5] + a12 * rm[8];
        const b20 = a20 * rm[0] + a21 * rm[3] + a22 * rm[6], b21 = a20 * rm[1] + a21 * rm[4] + a22 * rm[7], b22 = a20 * rm[2] + a21 * rm[5] + a22 * rm[8];
        a00 = b00; a01 = b01; a02 = b02; a10 = b10; a11 = b11; a12 = b12; a20 = b20; a21 = b21; a22 = b22;
      }
      const psx = pose[q + 6], psy = pose[q + 7], psz = pose[q + 8];
      a00 *= psx; a10 *= psx; a20 *= psx; a01 *= psy; a11 *= psy; a21 *= psy; a02 *= psz; a12 *= psz; a22 *= psz;
      const tx = part.origin[0] + pose[q], ty = part.origin[1] + pose[q + 1], tz = part.origin[2] + pose[q + 2];
      const pi = part.parentIndex;
      if (pi < 0) {
        W[w] = a00; W[w + 1] = a01; W[w + 2] = a02; W[w + 3] = tx;
        W[w + 4] = a10; W[w + 5] = a11; W[w + 6] = a12; W[w + 7] = ty;
        W[w + 8] = a20; W[w + 9] = a21; W[w + 10] = a22; W[w + 11] = tz;
      } else {
        const u = pi * 12;
        const p00 = W[u], p01 = W[u + 1], p02 = W[u + 2], p03 = W[u + 3], p10 = W[u + 4], p11 = W[u + 5], p12 = W[u + 6], p13 = W[u + 7], p20 = W[u + 8], p21 = W[u + 9], p22 = W[u + 10], p23 = W[u + 11];
        W[w] = p00 * a00 + p01 * a10 + p02 * a20; W[w + 1] = p00 * a01 + p01 * a11 + p02 * a21; W[w + 2] = p00 * a02 + p01 * a12 + p02 * a22; W[w + 3] = p00 * tx + p01 * ty + p02 * tz + p03;
        W[w + 4] = p10 * a00 + p11 * a10 + p12 * a20; W[w + 5] = p10 * a01 + p11 * a11 + p12 * a21; W[w + 6] = p10 * a02 + p11 * a12 + p12 * a22; W[w + 7] = p10 * tx + p11 * ty + p12 * tz + p13;
        W[w + 8] = p20 * a00 + p21 * a10 + p22 * a20; W[w + 9] = p20 * a01 + p21 * a11 + p22 * a21; W[w + 10] = p20 * a02 + p21 * a12 + p22 * a22; W[w + 11] = p20 * tx + p21 * ty + p22 * tz + p23;
      }
      // rows into texture: texel k = row k, rgba = [m_k0, m_k1, m_k2, t_k]
      const t = rowBase + p * 12;
      td[t] = W[w]; td[t + 1] = W[w + 1]; td[t + 2] = W[w + 2]; td[t + 3] = W[w + 3];
      td[t + 4] = W[w + 4]; td[t + 5] = W[w + 5]; td[t + 6] = W[w + 6]; td[t + 7] = W[w + 7];
      td[t + 8] = W[w + 8]; td[t + 9] = W[w + 9]; td[t + 10] = W[w + 10]; td[t + 11] = W[w + 11];
    }
    const ca = M.instanceColor.array;
    ca[j * 3] = team[0]; ca[j * 3 + 1] = team[1]; ca[j * 3 + 2] = team[2];
    const fa = far ? this.fxArrF : this.fxArr, f = j * 4; fa[f] = flash; fa[f + 1] = stone; fa[f + 2] = glow; fa[f + 3] = i;
    return i;
  }
  /** World-space position of a model-space point attached to a part of the most recently added instance i (for attach points, muzzle, saddle). */
  attachWorld(i, partIndex, lx, ly, lz, out) {
    const t = i * this.P * 12 + partIndex * 12, td = this.texData;
    // model-space (root-relative) coords of the local voxel-point (already in world units relative to part pivot)
    const mx = td[t] * lx + td[t + 1] * ly + td[t + 2] * lz + td[t + 3];
    const my = td[t + 4] * lx + td[t + 5] * ly + td[t + 6] * lz + td[t + 7];
    const mz = td[t + 8] * lx + td[t + 9] * ly + td[t + 10] * lz + td[t + 11];
    const l = this.loc[i], im = (l < 0 ? this.far : this.mesh).instanceMatrix.array, o = (l < 0 ? ~l : l) * 16;
    out[0] = im[o] * mx + im[o + 4] * my + im[o + 8] * mz + im[o + 12];
    out[1] = im[o + 1] * mx + im[o + 5] * my + im[o + 9] * mz + im[o + 13];
    out[2] = im[o + 2] * mx + im[o + 6] * my + im[o + 10] * mz + im[o + 14];
    return out;
  }
  _grow() {
    const keep = this.count, nN = this.nNear, nF = this.nFar;
    const oldFx = this.fxArr, oldFxF = this.fxArrF, oldCol = this.mesh.instanceColor.array, oldColF = this.far ? this.far.instanceColor.array : null, oldTex = this.texData;
    this._alloc(this.capacity * 2);
    this.texData.set(oldTex.subarray(0, keep * this.P * 12));
    this.fxArr.set(oldFx.subarray(0, nN * 4)); this.mesh.instanceColor.array.set(oldCol.subarray(0, nN * 3));
    if (this.far && oldFxF) { this.fxArrF.set(oldFxF.subarray(0, nF * 4)); this.far.instanceColor.array.set(oldColF.subarray(0, nF * 3)); }
    this.count = keep; this.nNear = nN; this.nFar = nF;
  }
  end() {
    this._flush(this.mesh, this.nNear, this.fxAttr);
    if (this.far) this._flush(this.far, this.nFar, this.fxAttrF);
    if (this.count) this.tex.needsUpdate = true;
  }
  _flush(m, n, fxAttr) {
    m.count = n; m.visible = n > 0;
    if (!n) return;
    m.instanceMatrix.updateRange.offset = 0; m.instanceMatrix.updateRange.count = n * 16; m.instanceMatrix.needsUpdate = true;
    m.instanceColor.updateRange.offset = 0; m.instanceColor.updateRange.count = n * 3; m.instanceColor.needsUpdate = true;
    fxAttr.updateRange.offset = 0; fxAttr.updateRange.count = n * 4; fxAttr.needsUpdate = true;
  }
  dispose() {
    this.host.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.geometry.dispose();
    if (this.far) { this.host.scene.remove(this.far); this.far.geometry.dispose(); this.geometryFar.dispose(); }
    this.material.dispose(); if (this.depthMaterial) this.depthMaterial.dispose();
    this.tex.dispose();
  }
}
