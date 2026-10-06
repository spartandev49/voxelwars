// Engine: WebGL renderer, scene, lights, sky, clouds, fog, optional bloom, quality presets.
// Owns nothing about gameplay. The app calls engine.render(dt) once per frame.

import { clamp, lerp } from '../core/rng.js';
import { Post } from './post.js';
import { POST_TIERS, GRADE, LIGHT } from './style.js';

const THREE = () => window.THREE;

export const QUALITY = {
  potato:   { label: 'Potato',   pr: 0.7, shadow: 0,    post: false, clouds: false, debris: 1200,  particles: 600,  weather: 0.3, viewScale: 0.85 },
  papyrus:  { label: 'Papyrus',  pr: 1.0, shadow: 1024, post: false, clouds: true,  debris: 3500,  particles: 1500, weather: 0.6, viewScale: 1.0 },
  marble:   { label: 'Marble',   pr: 1.5, shadow: 2048, post: true,  clouds: true,  debris: 8000,  particles: 3500, weather: 1.0, viewScale: 1.0 },
  olympian: { label: 'Olympian', pr: 2.0, shadow: 4096, post: true,  clouds: true,  debris: 16000, particles: 7000, weather: 1.0, viewScale: 1.0 },
};

/** sRGB hex -> THREE.Color in linear space (what the shaders expect when outputEncoding = sRGB). */
export function lin(hex) { const c = new (THREE().Color)(hex); c.convertSRGBToLinear(); return c; }

const SKY_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }`;
const SKY_FRAG = `
varying vec3 vDir;
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uGround; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uStars; uniform float uTime;
float hash(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55));
  col = mix(col, uGround, smoothstep(0.0, -0.25, h));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * (pow(sd, 700.0) * 2.0 + pow(sd, 14.0) * 0.28 + pow(sd, 3.0) * 0.08);
  if (uStars > 0.01 && h > 0.0) {
    vec3 g = floor(d * 160.0);
    float s = step(0.9965, hash(g));
    col += vec3(s) * uStars * smoothstep(0.0, 0.25, h) * (0.6 + 0.4*sin(uTime*2.0 + hash(g)*30.0));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export class Engine {
  constructor(parent) {
    const T = THREE();
    this.parent = parent;
    this.qualityKey = 'marble';
    this.q = QUALITY.marble;
    this.autoScale = 1;
    this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.toneMapping = T.NoToneMapping;       // tone mapping + sRGB encode happen once, in Post (HDR path at every tier)
    this.renderer.autoClear = true;
    this.post = new Post(this.renderer);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.domElement.id = 'vw-canvas';
    parent.appendChild(this.renderer.domElement);

    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(48, 1, 0.3, 900);
    this.camera.position.set(-30, 28, 30);
    this.camera.lookAt(0, 4, 0);
    this.focus = new T.Vector3(0, 0, 0);

    // lights
    this.hemi = new T.HemisphereLight(0xcfe6ff, 0x7a6a50, 0.8);
    this.sun = new T.DirectionalLight(0xfff0d8, 1.3);
    this.sun.castShadow = true;
    this.sun.shadow.bias = LIGHT.shadowBias;
    this.sun.shadow.normalBias = LIGHT.shadowNormalBias;
    this.sunTarget = new T.Object3D();
    this.sun.target = this.sunTarget;
    this.scene.add(this.hemi, this.sun, this.sunTarget);
    this.shadowRadius = 55;

    // sky dome
    this.skyMat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uZenith: { value: new T.Color(0x3d7fc9) }, uHorizon: { value: new T.Color(0xbfdcf2) }, uGround: { value: new T.Color(0x6a7a6a) },
        uSunDir: { value: new T.Vector3(0.4, 0.8, 0.3) }, uSunColor: { value: new T.Color(0xfff2c8) }, uStars: { value: 0 }, uTime: { value: 0 },
      },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
    });
    this.sky = new T.Mesh(new T.SphereGeometry(500, 32, 16), this.skyMat);
    this.sky.frustumCulled = false; this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    this.clouds = null;
    this.env = { time: 11, weather: 'clear', fog: 0.25, theme: 'greek', wind: 0.3 };
    this.fogColor = new T.Color(0xbfdcf2);
    this.scene.fog = new T.Fog(0xbfdcf2, 80, 320);
    this.time = 0;
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.resize();
    this.setQuality('marble');
    this.setEnvironment(this.env, null);
  }

  setQuality(key) {
    const q = QUALITY[key] || QUALITY.marble;
    this.qualityKey = key; this.q = q;
    const r = this.renderer;
    r.shadowMap.enabled = q.shadow > 0;
    this.sun.castShadow = q.shadow > 0;
    if (q.shadow > 0) {
      if (this.sun.shadow.mapSize.x !== q.shadow) {
        this.sun.shadow.mapSize.set(q.shadow, q.shadow);
        if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
      }
    }
    const pt = POST_TIERS[key] || POST_TIERS.marble;
    this.post.configure({ levels: pt.levels, bloom: pt.bloom, samples: pt.samples, exposure: GRADE.exposure, saturation: GRADE.saturation, contrast: GRADE.contrast, vignette: GRADE.vignette });
    this._buildClouds();
    this.resize();
    // materials need to recompile when shadows toggle
    this.scene.traverse((o) => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach((x) => (x.needsUpdate = true)); } });
  }

  _buildClouds() {
    const T = THREE();
    if (this.clouds) { this.scene.remove(this.clouds); this.clouds.geometry.dispose(); this.clouds = null; }
    if (!this.q.clouds) return;
    const rng = (() => { let s = 1234567; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    const boxes = [];
    for (let c = 0; c < 26; c++) {
      const cx = (rng() - 0.5) * 520, cz = (rng() - 0.5) * 520, cy = 62 + rng() * 22, n = 5 + Math.floor(rng() * 9);
      for (let i = 0; i < n; i++) boxes.push([cx + (rng() - 0.5) * 26, cy + (rng() - 0.5) * 3, cz + (rng() - 0.5) * 12, 6 + rng() * 9, 2.4 + rng() * 2.6, 5 + rng() * 6]);
    }
    const geo = new T.BoxGeometry(1, 1, 1);
    const mat = new T.MeshBasicMaterial({ color: 0xffffff, fog: false });
    this.cloudMat = mat;
    const mesh = new T.InstancedMesh(geo, mat, boxes.length);
    const m = new T.Matrix4();
    boxes.forEach((b, i) => { m.compose(new T.Vector3(b[0], b[1], b[2]), new T.Quaternion(), new T.Vector3(b[3], b[4], b[5])); mesh.setMatrixAt(i, m); });
    mesh.frustumCulled = false;
    this.clouds = mesh;
    this.scene.add(mesh);
  }

  /** Apply an arena environment: time of day, weather tint, fog density. */
  setEnvironment(env, arena) {
    const T = THREE();
    this.env = Object.assign({}, this.env, env || {});
    const e = this.env, t = e.time;
    // sun path: rises at 6, peaks at 12, sets at 18
    const ang = ((t - 6) / 12) * Math.PI;                 // 0..PI during daytime
    const elev = Math.sin(ang);                           // -1..1
    const az = Math.cos(ang);
    const night = clamp(-elev * 3 + 0.15, 0, 1);
    const dusk = clamp(1 - Math.abs(elev) * 3.0, 0, 1);   // warm band near the horizon
    const dir = new T.Vector3(az * 0.9, Math.max(0.12, Math.abs(elev)) * (elev >= 0 ? 1 : 0.6), 0.45).normalize();
    this.sunDir = dir;
    const dayZenith = lin(0x3a78c4), nightZenith = lin(0x070b24), duskZenith = lin(0x5a5fa8);
    const dayHorizon = lin(0xbfdcf2), nightHorizon = lin(0x1a2348), duskHorizon = lin(0xffb27a);
    let zenith = dayZenith.clone().lerp(duskZenith, dusk * 0.7).lerp(nightZenith, night);
    let horizon = dayHorizon.clone().lerp(duskHorizon, dusk * 0.85).lerp(nightHorizon, night);
    // weather greys the sky
    const w = e.weather;
    const grey = { clear: 0, cloudy: 0.5, rain: 0.75, storm: 0.9, snow: 0.55, sandstorm: 0.7, fog: 0.8 }[w] ?? 0;
    const wTint = w === 'sandstorm' ? lin(0xcfa468) : lin(0x8f9aa6);
    zenith.lerp(wTint.clone().multiplyScalar(1 - night * 0.85), grey * 0.8);
    horizon.lerp(wTint.clone().multiplyScalar(1 - night * 0.85), grey);
    const u = this.skyMat.uniforms;
    u.uZenith.value.copy(zenith); u.uHorizon.value.copy(horizon); u.uGround.value.copy(horizon).multiplyScalar(0.82);
    u.uSunDir.value.copy(dir);
    u.uSunColor.value.copy(lin(0xffe6b0).lerp(lin(0xff8a40), dusk)).multiplyScalar(1 - grey * 0.8);
    u.uStars.value = night * (1 - grey);
    // lights
    const sunI = clamp(elev * 1.6 + 0.35, 0.0, 1.0) * (1 - grey * 0.65);
    this.sun.intensity = 0.1 + 0.95 * sunI;
    this.sun.color.copy(lin(0xfff1da).lerp(lin(0xff9c52), dusk * 0.9)).lerp(lin(0x9fb4ff), night * 0.9);
    this.hemi.intensity = 0.34 + 0.34 * (1 - night) * (1 - grey * 0.3) + 0.1 * night;
    this.hemi.color.copy(horizon).lerp(lin(0xffffff), 0.35);
    this.hemi.groundColor.copy(lin(0x6e5c40)).lerp(lin(0x1a1830), night * 0.8);
    this.post.exposure = GRADE.exposure * (1 + 0.1 * (1 - night));
    // fog
    const fogK = clamp(e.fog + (w === 'fog' ? 0.35 : w === 'rain' || w === 'storm' ? 0.18 : w === 'sandstorm' ? 0.4 : 0), 0, 1);
    const near = lerp(130, 12, fogK), far = lerp(480, 80, Math.pow(fogK, 0.8));
    this.fogColor.copy(horizon);
    this.scene.fog.color.copy(horizon); this.scene.fog.near = near; this.scene.fog.far = far;
    if (this.cloudMat) this.cloudMat.color.copy(lin(0xffffff)).multiplyScalar(0.5 + 0.55 * (1 - night)).lerp(wTint, grey * 0.5);
    this.cloudSpeed = 0.6 + (e.wind || 0) * 2.5;
    this.fogParams = { near, far };
    return { near, far, color: horizon };
  }

  /** Move the shadow frustum to follow a focus point and snap to texels (no shimmering). */
  _updateShadow() {
    if (!this.sun.castShadow) return;
    const f = this.focus, R = this.shadowRadius, d = this.sunDir || new (THREE().Vector3)(0.4, 0.8, 0.3);
    const cam = this.sun.shadow.camera;
    cam.left = -R; cam.right = R; cam.top = R; cam.bottom = -R; cam.near = 1; cam.far = R * 6;
    cam.updateProjectionMatrix();
    const texel = (R * 2) / this.sun.shadow.mapSize.x;
    const fx = Math.round(f.x / texel) * texel, fz = Math.round(f.z / texel) * texel;
    this.sunTarget.position.set(fx, f.y, fz);
    this.sun.position.set(fx + d.x * R * 3, f.y + d.y * R * 3, fz + d.z * R * 3);
    this.sunTarget.updateMatrixWorld(); this.sun.updateMatrixWorld();
  }

  resize() {
    const w = this.parent.clientWidth || window.innerWidth, h = this.parent.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.q.pr) * this.autoScale;
    this.renderer.setPixelRatio(Math.max(0.4, dpr));
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const bs = this.renderer.getDrawingBufferSize(new (window.THREE.Vector2)());
    this.post.setSize(bs.x, bs.y);
  }
  setAutoScale(s) { s = clamp(s, 0.5, 1); if (Math.abs(s - this.autoScale) > 0.01) { this.autoScale = s; this.resize(); } }

  render(dt) {
    this.time += dt;
    const c = this.camera;
    this.sky.position.copy(c.position);
    this.skyMat.uniforms.uTime.value = this.time;
    if (this.clouds) { this.clouds.position.x += (this.cloudSpeed || 1) * dt; if (this.clouds.position.x > 260) this.clouds.position.x -= 520; this.clouds.position.set(this.clouds.position.x, 0, 0); }
    this._updateShadow();
    this.post.hurt = this.hurt || 0;
    this.post.render(this.scene, c, dt, this.time);
  }
  dispose() { window.removeEventListener('resize', this.onResize); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
