// Post: the single render path for every quality tier.
//   scene -> HDR render target (half float, MSAA) -> [bloom chain] -> composite (exposure, ACES, grade, vignette, flash, sRGB) -> screen.
// Materials always compile with NoToneMapping + linear output (one program set for all tiers); tiers only change bloom levels,
// MSAA samples and resolution. Zero CDN dependency.

const T = () => window.THREE;

const FS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BRIGHT_FRAG = `
precision highp float; varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uThreshold; uniform float uKnee;
void main(){
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee); soft = soft * soft / (4.0 * uKnee + 1e-4);
  float w = max(soft, l - uThreshold) / max(l, 1e-4);
  gl_FragColor = vec4(c * w, 1.0);
}`;
const DOWN_FRAG = `
precision highp float; varying vec2 vUv; uniform sampler2D tDiffuse; uniform vec2 uTexel;
void main(){
  vec3 a = texture2D(tDiffuse, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  vec3 b = texture2D(tDiffuse, vUv + uTexel * vec2( 1.0, -1.0)).rgb;
  vec3 c = texture2D(tDiffuse, vUv + uTexel * vec2(-1.0,  1.0)).rgb;
  vec3 d = texture2D(tDiffuse, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  vec3 e = texture2D(tDiffuse, vUv).rgb;
  gl_FragColor = vec4((a + b + c + d) * 0.125 + e * 0.5, 1.0);
}`;
const UP_FRAG = `
precision highp float; varying vec2 vUv; uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uWeight;
void main(){
  vec3 s = texture2D(tDiffuse, vUv + uTexel * vec2(-1.0, 0.0)).rgb + texture2D(tDiffuse, vUv + uTexel * vec2(1.0, 0.0)).rgb
         + texture2D(tDiffuse, vUv + uTexel * vec2(0.0, -1.0)).rgb + texture2D(tDiffuse, vUv + uTexel * vec2(0.0, 1.0)).rgb;
  s += (texture2D(tDiffuse, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tDiffuse, vUv + uTexel * vec2(1.0, -1.0)).rgb
      + texture2D(tDiffuse, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tDiffuse, vUv + uTexel * vec2(1.0, 1.0)).rgb) * 0.5;
  s += texture2D(tDiffuse, vUv).rgb * 2.0;
  gl_FragColor = vec4(s / 8.0 * uWeight, 1.0);
}`;
const COMPOSITE_FRAG = `
precision highp float; varying vec2 vUv; uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uBloom; uniform float uExposure;
uniform float uVignette; uniform float uSaturation; uniform float uContrast; uniform vec3 uFlash; uniform float uTime; uniform float uHurt;
vec3 aces(vec3 x){ const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
vec3 toSrgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  vec3 c = texture2D(tScene, vUv).rgb;
  c += texture2D(tBloom, vUv).rgb * uBloom;
  c *= uExposure;
  c += uFlash;
  c = aces(c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  c = (c - 0.5) * uContrast + 0.5;
  vec2 q = vUv - 0.5; float v = 1.0 - dot(q, q) * uVignette * 2.2; c *= clamp(v, 0.0, 1.0);
  c = mix(c, vec3(0.9, 0.1, 0.1), uHurt * smoothstep(0.3, 0.9, length(q) * 1.6));
  gl_FragColor = vec4(toSrgb(clamp(c, 0.0, 1.0)), 1.0);
}`;

export class Post {
  constructor(renderer) {
    const THREE = T();
    this.r = renderer;
    this.levels = 4;              // bloom mip levels (0 disables bloom)
    this.bloom = 0.35;            // bloom strength
    this.exposure = 1.0;
    this.vignette = 0.35;
    this.saturation = 1.1;
    this.contrast = 1.04;
    this.flash = new THREE.Vector3(0, 0, 0);
    this.hurt = 0;
    this.samples = 4;
    this.w = 2; this.h = 2;
    this.cam = new THREE.Camera();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    const mk = (frag, uniforms, extra = {}) => new THREE.ShaderMaterial(Object.assign({ vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false }, extra));
    this.mBright = mk(BRIGHT_FRAG, { tDiffuse: { value: null }, uThreshold: { value: 1.0 }, uKnee: { value: 0.5 } });
    this.mDown = mk(DOWN_FRAG, { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mUp = mk(UP_FRAG, { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() }, uWeight: { value: 1 } }, { blending: THREE.AdditiveBlending, transparent: true });
    this.mComp = mk(COMPOSITE_FRAG, { tScene: { value: null }, tBloom: { value: null }, uBloom: { value: 0 }, uExposure: { value: 1 }, uVignette: { value: 0.3 }, uSaturation: { value: 1.1 }, uContrast: { value: 1.04 }, uFlash: { value: this.flash }, uTime: { value: 0 }, uHurt: { value: 0 } });
    this.quad = new THREE.Mesh(geo, this.mComp); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad);
    this.rtScene = null; this.chain = [];
  }
  _rt(w, h, samples = 0) {
    const THREE = T();
    const hdr = this.r.extensions.has('EXT_color_buffer_float') || this.r.extensions.has('EXT_color_buffer_half_float');
    return new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: samples > 0 || true, stencilBuffer: false, generateMipmaps: false, samples });
  }
  setSize(w, h) {
    this.w = Math.max(2, w | 0); this.h = Math.max(2, h | 0);
    this._build();
  }
  /** levels 0..5, msaa samples 0|2|4 */
  configure({ levels, bloom, samples, exposure, vignette, saturation, contrast }) {
    let rebuild = false;
    if (levels !== undefined && levels !== this.levels) { this.levels = levels; rebuild = true; }
    if (samples !== undefined && samples !== this.samples) { this.samples = samples; rebuild = true; }
    if (bloom !== undefined) this.bloom = bloom;
    if (exposure !== undefined) this.exposure = exposure;
    if (vignette !== undefined) this.vignette = vignette;
    if (saturation !== undefined) this.saturation = saturation;
    if (contrast !== undefined) this.contrast = contrast;
    if (rebuild) this._build();
  }
  _build() {
    for (const t of [this.rtScene, ...this.chain]) if (t) t.dispose();
    this.rtScene = this._rt(this.w, this.h, this.samples);
    this.chain = [];
    let w = this.w, h = this.h;
    for (let i = 0; i < this.levels; i++) { w = Math.max(2, w >> 1); h = Math.max(2, h >> 1); this.chain.push(this._rt(w, h, 0)); }
  }
  /** Render `scene` through the HDR path to the screen. */
  render(scene, camera, dt = 0.016, time = 0) {
    const r = this.r;
    if (!this.rtScene) this._build();
    const prevTM = r.toneMapping; r.toneMapping = T().NoToneMapping;
    r.setRenderTarget(this.rtScene); r.clear(); r.render(scene, camera);
    let bloomTex = null;
    if (this.levels > 0 && this.bloom > 0.001) {
      // bright pass into level 0, then downsample
      this.quad.material = this.mBright; this.mBright.uniforms.tDiffuse.value = this.rtScene.texture;
      r.setRenderTarget(this.chain[0]); r.clear(); r.render(this.scene, this.cam);
      this.quad.material = this.mDown;
      for (let i = 1; i < this.chain.length; i++) {
        this.mDown.uniforms.tDiffuse.value = this.chain[i - 1].texture;
        this.mDown.uniforms.uTexel.value.set(1 / this.chain[i - 1].width, 1 / this.chain[i - 1].height);
        r.setRenderTarget(this.chain[i]); r.clear(); r.render(this.scene, this.cam);
      }
      this.quad.material = this.mUp;
      for (let i = this.chain.length - 1; i > 0; i--) {
        this.mUp.uniforms.tDiffuse.value = this.chain[i].texture;
        this.mUp.uniforms.uTexel.value.set(1 / this.chain[i].width, 1 / this.chain[i].height);
        this.mUp.uniforms.uWeight.value = 1.0;
        r.setRenderTarget(this.chain[i - 1]); r.autoClear = false; r.render(this.scene, this.cam); r.autoClear = true;
      }
      bloomTex = this.chain[0].texture;
    }
    // composite to screen
    const u = this.mComp.uniforms;
    u.tScene.value = this.rtScene.texture;
    u.tBloom.value = bloomTex || this.rtScene.texture;
    u.uBloom.value = bloomTex ? this.bloom : 0;
    u.uExposure.value = this.exposure; u.uVignette.value = this.vignette; u.uSaturation.value = this.saturation; u.uContrast.value = this.contrast;
    u.uTime.value = time; u.uHurt.value = this.hurt;
    this.quad.material = this.mComp;
    r.setRenderTarget(null); r.render(this.scene, this.cam);
    r.toneMapping = prevTM;
  }
  dispose() { for (const t of [this.rtScene, ...this.chain]) if (t) t.dispose(); for (const m of [this.mBright, this.mDown, this.mUp, this.mComp]) m.dispose(); this.quad.geometry.dispose(); }
}
