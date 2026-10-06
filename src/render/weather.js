// weather.js: falling rain, drifting snow and blowing sand drawn as voxel cubes around the camera target (verification R13: weather visuals exist and are capped by tier).
// One InstancedMesh; the cubes live in a box that follows the camera and wrap around it, so the cost is a fixed number of instances and nothing is allocated per frame.
// All motion is in the vertex shader (the instances hold a random seed only): the CPU only writes two uniforms per frame.
const T = () => window.THREE;

const KINDS = {
  // count at tier scale 1, cube size [x, y, z], velocity [x, y, z] in u/s (wind adds to x/z), colour, opacity
  rain:      { n: 3800, size: [0.035, 0.85, 0.035], vel: [1.5, -36, 0.5], wind: 0.8, col: [0.72, 0.82, 0.98], alpha: 0.42 },
  storm:     { n: 5400, size: [0.04, 1.0, 0.04], vel: [6, -44, 2], wind: 3.2, col: [0.66, 0.76, 0.95], alpha: 0.46 },
  snow:      { n: 2600, size: [0.13, 0.13, 0.13], vel: [0.6, -3.4, 0.2], wind: 1.4, col: [1, 1, 1], alpha: 0.95, sway: 0.9 },
  sandstorm: { n: 5200, size: [0.95, 0.05, 0.05], vel: [16, -0.6, 3.5], wind: 8, col: [0.86, 0.68, 0.42], alpha: 0.5 },
};

const VERT = `
uniform float uT; uniform vec3 uC; uniform vec3 uVol; uniform vec3 uVel; uniform vec3 uSize; uniform float uSway;
attribute vec3 aSeed;
varying float vA;
void main() {
  // the particle's lattice position is fixed in the WORLD, so moving the camera does not drag the weather along; it wraps inside a box centred on the camera target
  vec3 base = aSeed * uVol;
  vec3 p = base + uVel * uT;
  p.x += sin(uT * 1.3 + aSeed.y * 40.0) * uSway; p.z += cos(uT * 1.1 + aSeed.x * 40.0) * uSway;
  vec3 rel = mod(p - uC + uVol * 0.5, uVol) - uVol * 0.5;
  vec3 world = uC + rel;
  // fade out toward the walls of the box so nothing pops
  vec3 e = abs(rel) / (uVol * 0.5);
  vA = 1.0 - smoothstep(0.78, 1.0, max(max(e.x, e.y), e.z));
  vec4 mv = modelViewMatrix * vec4(world + position * uSize, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform vec3 uCol; uniform float uAlpha;
varying float vA;
void main() { gl_FragColor = vec4(uCol, uAlpha * vA); }`;

export class WeatherLayer {
  constructor(scene) {
    this.scene = scene; this.mesh = null; this.kind = ''; this.scale = 1; this.t = 0; this.vol = [90, 46, 90]; this.geo = null; this.mat = null;
  }
  /** kind: 'clear' | 'cloudy' | 'fog' draw nothing; rain / storm / snow / sandstorm draw cubes. scale: the tier's weather factor (0 = off). wind 0..1 bends the fall. */
  set(kind, scale, wind) {
    this.clear();
    const k = KINDS[kind]; this.kind = kind || '';
    if (!k || !(scale > 0)) return false;
    const THREE = T(), n = Math.max(80, Math.round(k.n * scale)), seed = new Float32Array(n * 3);
    let s = 0x9e3779b9;
    const rnd = () => { s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0; s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0; return ((s ^ (s >>> 16)) >>> 0) / 4294967296; };
    for (let i = 0; i < n * 3; i++) seed[i] = rnd();
    const box = new THREE.BoxGeometry(1, 1, 1), geo = new THREE.InstancedBufferGeometry();
    geo.setIndex(box.getIndex()); geo.setAttribute('position', box.getAttribute('position'));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 3)); geo.instanceCount = n;
    const w = Math.max(0, Math.min(1, wind == null ? 0.3 : wind)) * k.wind;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: false,
      uniforms: { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uVol: { value: new THREE.Vector3(this.vol[0], this.vol[1], this.vol[2]) }, uVel: { value: new THREE.Vector3(k.vel[0] + w, k.vel[1], k.vel[2] + w * 0.4) }, uSize: { value: new THREE.Vector3(k.size[0], k.size[1], k.size[2]) }, uSway: { value: k.sway || 0 }, uCol: { value: new THREE.Color(k.col[0], k.col[1], k.col[2]) }, uAlpha: { value: k.alpha } },
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 18; this.scene.add(mesh);
    this.mesh = mesh; this.geo = geo; this.mat = mat; this.scale = scale; this.count = n;
    return true;
  }
  /** Follow the camera target; t = real seconds (weather keeps falling while the sim is paused). */
  update(t, x, y, z) {
    if (!this.mesh) return;
    const u = this.mat.uniforms; u.uT.value = t; u.uC.value.set(x, y + 8, z);
  }
  clear() {
    if (this.mesh) { this.scene.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); }
    this.mesh = null; this.geo = null; this.mat = null; this.count = 0;
  }
  dispose() { this.clear(); }
}
