// TerrainRenderer: turns an Arena into THREE meshes (16x16-cell chunks), animated water / lava, and answers
// ray queries against the heightfield. Chunks rebuild individually when the arena is edited or cratered.

import { CELL, HSTEP } from '../world/arena.js';
import { meshTerrainChunk } from './terrainMesh.js';
import { lin } from './engine.js';

const CH = 16;

export class TerrainRenderer {
  constructor(scene, quality = {}) {
    this.scene = scene;
    this.group = new window.THREE.Group();
    this.group.name = 'terrain';
    scene.add(this.group);
    this.arena = null;
    this.chunks = new Map();
    this.material = null;
    this.water = null;
    this.time = 0;
    this.dirty = new Set();
    this.quality = quality;
  }
  _material() {
    if (this.material) return this.material;
    const T = window.THREE;
    this.material = new T.MeshLambertMaterial({ vertexColors: true });
    return this.material;
  }
  /** Build everything for a new arena. */
  setArena(arena) {
    this.clear();
    this.arena = arena;
    const n = Math.ceil(arena.size / CH);
    this.nChunks = n;
    for (let cz = 0; cz < n; cz++) for (let cx = 0; cx < n; cx++) this._buildChunk(cx, cz);
    this._buildLiquid();
  }
  clear() {
    for (const m of this.chunks.values()) { this.group.remove(m); m.geometry.dispose(); }
    this.chunks.clear();
    if (this.water) { this.group.remove(this.water); this.water.geometry.dispose(); this.water = null; }
    if (this.base) { this.group.remove(this.base); this.base = null; }
    this.dirty.clear();
  }
  _buildChunk(cx, cz) {
    const T = window.THREE, key = cx + ',' + cz;
    const old = this.chunks.get(key);
    if (old) { this.group.remove(old); old.geometry.dispose(); this.chunks.delete(key); }
    const m = meshTerrainChunk(this.arena, cx * CH, cz * CH, CH);
    if (!m.quadCount) return;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(m.positions, 3));
    g.setAttribute('normal', new T.BufferAttribute(m.normals, 3));
    g.setAttribute('color', new T.BufferAttribute(m.colors, 3));
    g.setIndex(new T.BufferAttribute(m.indices, 1));
    g.computeBoundingSphere();
    const mesh = new T.Mesh(g, this._material());
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.group.add(mesh);
    this.chunks.set(key, mesh);
  }
  /** Mark a cell rectangle dirty; rebuilds are batched in update(). */
  markDirty(rect) {
    const x0 = Math.max(0, Math.floor((rect.x0 - 1) / CH)), x1 = Math.min(this.nChunks - 1, Math.floor((rect.x1 + 1) / CH));
    const z0 = Math.max(0, Math.floor((rect.z0 - 1) / CH)), z1 = Math.min(this.nChunks - 1, Math.floor((rect.z1 + 1) / CH));
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.dirty.add(x + ',' + z);
  }
  /** Rebuild all dirty chunks right now (editor) or a few per frame (battle craters). */
  flush(maxChunks = 99) {
    let n = 0;
    for (const k of this.dirty) {
      const [x, z] = k.split(',').map(Number);
      this._buildChunk(x, z);
      this.dirty.delete(k);
      if (++n >= maxChunks) break;
    }
    if (n && this.arena.water > 0) this._buildLiquid();
    return n;
  }
  _buildLiquid() {
    const T = window.THREE, a = this.arena;
    if (this.water) { this.group.remove(this.water); this.water.geometry.dispose(); this.water = null; }
    if (!(a.water > 0)) return;
    const W = a.worldSize();
    const geo = new T.PlaneGeometry(W, W, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const lava = a.lava;
    const mat = new T.ShaderMaterial({
      transparent: !lava,
      depthWrite: lava,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: lin(lava ? 0xb02a08 : 0x1c5f8f) },
        uShallow: { value: lin(lava ? 0xff7a1a : 0x4fc3d9) },
        uSun: { value: new T.Vector3(0.5, 0.8, 0.3) },
        uFog: { value: lin(0xaec6dc) },
        uFogNear: { value: 80 }, uFogFar: { value: 400 },
        uOpacity: { value: lava ? 1 : 0.82 },
      },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSun; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; uniform float uOpacity;
        varying vec3 vW;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec2 uv = vW.xz;
          // blocky ripples: quantise to 0.5 unit cells so the water reads as voxel water
          vec2 q = floor(uv*2.0)/2.0;
          float n1 = vnoise(q*0.9 + vec2(uTime*0.35, uTime*0.2));
          float n2 = vnoise(q*1.7 - vec2(uTime*0.25, uTime*0.4));
          float w = n1*0.6 + n2*0.4;
          vec3 col = mix(uDeep, uShallow, smoothstep(0.25, 0.85, w));
          float sparkle = step(0.86, vnoise(q*3.1 + uTime*0.8));
          col += sparkle * 0.18 * ${lava ? '0.3' : '1.0'};
          ${lava ? 'col += vec3(0.25,0.08,0.0) * smoothstep(0.55,0.95,n2);' : ''}
          float d = length(vW - cameraPosition);
          float f = smoothstep(uFogNear, uFogFar, d);
          col = mix(col, uFog, f);
          gl_FragColor = vec4(col, uOpacity);
        }`,
    });
    const mesh = new T.Mesh(geo, mat);
    mesh.position.y = a.water * HSTEP - 0.06;
    mesh.renderOrder = 2;
    this.water = mesh;
    this.group.add(mesh);
  }
  setFog(color, near, far) {
    if (!this.water) return;
    const u = this.water.material.uniforms;
    u.uFog.value.set(color); u.uFogNear.value = near; u.uFogFar.value = far;
  }
  update(dt) {
    this.time += dt;
    if (this.water) this.water.material.uniforms.uTime.value = this.time;
    if (this.dirty.size) this.flush(4);
  }
  /** Ray vs heightfield. origin/dir are plain {x,y,z}. Returns {x,y,z,cx,cz} or null. Marches in 0.25u steps then refines. */
  raycast(o, d, maxDist = 400) {
    const a = this.arena; if (!a) return null;
    const half = a.half();
    let t = 0, prevAbove = true, prevT = 0;
    const step = 0.3;
    for (; t < maxDist; t += step) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (x < -half || x > half || z < -half || z > half) { if (y < 0) return null; prevAbove = true; prevT = t; continue; }
      const g = a.cellHeight(x, z);
      const above = y > g;
      if (!above && prevAbove) {
        let lo = prevT, hi = t;
        for (let i = 0; i < 8; i++) { const m = (lo + hi) / 2; const mx = o.x + d.x * m, my = o.y + d.y * m, mz = o.z + d.z * m; if (my > a.cellHeight(mx, mz)) lo = m; else hi = m; }
        const px = o.x + d.x * hi, pz = o.z + d.z * hi;
        return { x: px, y: a.cellHeight(px, pz), z: pz, cx: a.cx(px), cz: a.cz(pz), t: hi };
      }
      prevAbove = above; prevT = t;
    }
    return null;
  }
  dispose() { this.clear(); this.scene.remove(this.group); if (this.material) this.material.dispose(); }
}
