// AU6 offline mix test. Runs a scripted 150v150 battle in the real sim (Node), records its event stream + unit positions, replays it through the
// real audio engine (router -> voices -> buses -> compressor -> limiter) on an OfflineAudioContext in headless Chromium using the real decoded
// assets, writes the master to .cache/mix_<name>.wav (32-bit float) and measures it with ffmpeg: ebur128 (integrated LUFS, true peak) and astats.
// Usage: node tools/mixtest.mjs [--arena=marathon] [--seed=11] [--stems] [--quality=olympian] [--vol.music=0.7 ...] [--json]
// Pass/fail (spec/audio.md section 6): true peak < -1 dBFS, 0 clipped samples, integrated loudness -18 +/- 3 LUFS, voices <= 32.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateArena } from '../src/world/gen.js';
import { World } from '../src/sim/world.js';
import { buildSimDefs } from '../src/sim/defs.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v === undefined ? true : v]; }));
const arenaId = args.arena || 'marathon', seed = +(args.seed || 11), quality = args.quality || 'olympian', maxT = args.maxT ? +args.maxT : Infinity;
const mix = {}; if (args.pre !== undefined) mix.preGain = Math.pow(10, +args.pre / 20); if (args.trim !== undefined) mix.outTrim = Math.pow(10, +args.trim / 20);   // dB overrides for calibration runs
const tag = args.tag || 'battle';
const cache = path.join(root, '.cache'); fs.mkdirSync(cache, { recursive: true });
const log = (...a) => { if (!args.json) console.log(...a); };

// ---------------------------------------------------------------- 1. scripted battle in the real sim
function recordBattle() {
  const defs = buildSimDefs(), arena = generateArena(arenaId, 'medium', 5), w = new World({ arena, seed, defs }), A = arena.zones.A, B = arena.zones.B;
  const army = (team, z0, h, mix) => { let k = 0; for (const [d, n] of mix) w.addSquad(d, team, n, team ? B.x : A.x, z0 + (k++) * 5, { heading: h }); };
  army(0, A.z - 14, Math.PI / 2, [['hoplite', 40], ['spartan', 14], ['cretan_archer', 24], ['peltast', 16], ['companion_cavalry', 14], ['strategos', 1], ['philosopher', 6], ['sacred_chicken', 20], ['battle_goat', 15]]);
  army(1, B.z - 14, -Math.PI / 2, [['legionary', 40], ['gladiator', 14], ['nubian_archer', 24], ['equites', 14], ['war_elephant', 3], ['catapult', 3], ['centurion', 1], ['senator', 6], ['pilum_thrower', 25], ['warhound', 20]]);
  const defIds = []; const di = (id) => { let i = defIds.indexOf(id); if (i < 0) { i = defIds.length; defIds.push(id); } return i; };
  const start = [w.stats[0].alive, w.stats[1].alive];
  const events = []; w.events.onAny((type, p) => { if (w.time > maxT) return; const c = type === 'battle_end' ? { winner: p.winner, reason: p.reason, t: p.t } : JSON.parse(JSON.stringify(p)); events.push([w.time, type, c]); });
  const frames = [];
  w.start();
  for (let i = 0; i < 30 * 240 && w.state !== 'ended' && w.time < maxT; i++) {
    w.tick();
    if (i % 8 === 0) frames.push({ t: w.time, alive: [w.stats[0].alive, w.stats[1].alive], u: w.units.map((u) => [u.id, di(u.def.id), +u.x.toFixed(2), +u.z.toFixed(2), +u.px.toFixed(2), +u.pz.toFixed(2)]) });
  }
  frames.push({ t: w.time + 0.01, alive: [w.stats[0].alive, w.stats[1].alive], u: [] });
  const info = { name: arena.name, env: arena.env, biome: arena.biome, water: arena.water, lava: arena.lava, props: arena.props.map((p) => ({ t: p.t })) };
  return { arena: info, defs: defIds, start, events, frames, units: start[0] + start[1], simTime: w.time, winner: w.winner };
}
const data = recordBattle();
log(`sim: ${data.units} units on ${arenaId}, ${data.simTime.toFixed(1)} s, ${data.events.length} events, winner ${data.winner}`);
const counts = {}; for (const e of data.events) counts[e[1]] = (counts[e[1]] || 0) + 1;
log('events: ' + Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => k + ' ' + v).join(', '));

// ---------------------------------------------------------------- 2. bundle the browser entry, serve assets, render
const bundle = await build({ entryPoints: [path.join(root, 'tests/audio/mix_entry.js')], bundle: true, write: false, format: 'iife', target: 'es2020', logLevel: 'error' });
const js = bundle.outputFiles[0].text;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/manifest.json'), 'utf8'));
const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
if (!fs.existsSync(exe)) { console.error('Chromium not found at ' + exe); process.exit(2); }
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const logs = []; page.on('console', (m) => { logs.push(m.type() + ': ' + m.text()); if (args.verbose) console.log('[page]', m.type(), m.text()); }); page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.route('**/*', (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: html });
  if (u.pathname.startsWith('/assets/')) { const p = path.join(root, decodeURIComponent(u.pathname)); if (p.startsWith(path.join(root, 'assets')) && fs.existsSync(p)) return r.fulfill({ path: p, contentType: p.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream' }); }
  return r.fulfill({ status: 404, body: 'nf' });
});
await page.goto('http://t/'); // route fulfils any host
async function render(name, cfg) {
  const res = await page.evaluate((c) => window.runMix(c), Object.assign({ data, manifest, quality }, cfg));
  const wav = path.join(cache, `mix_${name}.wav`);
  const frames = res.frames, size = 1 << 21;   // 2 MiB chunks of interleaved float32
  const header = Buffer.alloc(44); const dataBytes = frames * 2 * 4;
  header.write('RIFF', 0); header.writeUInt32LE(36 + dataBytes, 4); header.write('WAVE', 8); header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(3, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(res.sr, 24); header.writeUInt32LE(res.sr * 8, 28); header.writeUInt16LE(8, 32); header.writeUInt16LE(32, 34); header.write('data', 36); header.writeUInt32LE(dataBytes, 40);
  const fd = fs.openSync(wav, 'w'); fs.writeSync(fd, header);
  const per = size >> 1; let written = 0;
  for (let i = 0; i * per < frames; i++) { const b64 = await page.evaluate(([i, size]) => window.getChunk(i, size), [i, size]); let buf = Buffer.from(b64, 'base64'); const frs = Math.min(per, frames - i * per); buf = buf.subarray(0, frs * 8); fs.writeSync(fd, buf); written += buf.length; }
  fs.closeSync(fd);
  return { res, wav };
}

// ---------------------------------------------------------------- 3. measure with ffmpeg
function measure(wav) {
  const e = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr;
  const sum = e.slice(e.lastIndexOf('Summary:'));
  const num = (re) => { const m = re.exec(sum); return m ? parseFloat(m[1]) : NaN; };
  const out = { lufs: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), truePeak: num(/Peak:\s+(-?[\d.]+) dBFS/) };
  const a = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'astats=metadata=0', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr;
  const ov = a.slice(a.lastIndexOf('Overall'));
  const g = (re) => { const m = re.exec(ov); return m ? parseFloat(m[1]) : NaN; };
  out.peakDb = g(/Peak level dB:\s+(-?[\d.inf]+)/); out.rmsDb = g(/RMS level dB:\s+(-?[\d.inf]+)/); out.peakCount = g(/Peak count:\s+(\d+)/); out.nans = g(/Number of NaNs:\s+(\d+)/);
  return out;
}

const results = {};
const main = await render(tag, { mix, mute: [], volumes: Object.fromEntries(Object.entries(args).filter(([k]) => k.startsWith('vol.')).map(([k, v]) => [k.slice(4), +v])) });
results.main = Object.assign({}, measure(main.wav), { samplePeak: main.res.samplePeak, clipped: main.res.clipped, voicePeak: main.res.diag.voicePeak, steals: main.res.diag.voiceSteals, drops: main.res.diag.voiceDrops, duration: main.res.duration, renderMs: main.res.renderMs, loadMs: main.res.loadMs });
if (args.stems) {
  for (const [name, mute] of [['music', ['sfx', 'ui', 'announcer', 'ambience']], ['sfx', ['music']]]) { const r = await render('stem_' + name, { mix, mute, volumes: {} }); results[name] = Object.assign({}, measure(r.wav), { samplePeak: r.res.samplePeak }); }
}
const r = main.res;
if (args.json) console.log(JSON.stringify({ results, diag: r.diag }));
else {
  const m = results.main;
  log(`\nrender: ${r.duration.toFixed(1)} s @ ${r.sr} Hz in ${(r.renderMs / 1000).toFixed(1)} s (asset load+decode ${(r.loadMs / 1000).toFixed(1)} s); wav ${main.wav}`);
  log(`assets: ${r.decoded.ready}/${r.decoded.total} decoded, ${(r.decoded.decodedBytes / 1048576).toFixed(1)} MB PCM (tier ceilings: potato 40 / papyrus 80 / marble 160 / olympian 240 MB)`);
  log(`voices: peak ${m.voicePeak}/32, steals ${m.steals}, drops ${m.drops}; music: ${JSON.stringify(r.diag.music)}`);
  log('cues started: ' + Object.entries(r.diag.cueCounts).sort((a, b) => b[1] - a[1]).slice(0, 22).map(([k, v]) => k + ':' + v).join(' '));
  log(`master: integrated ${m.lufs} LUFS (target -18 +/- 3), true peak ${m.truePeak} dBFS (must be < -1), sample peak ${(20 * Math.log10(m.samplePeak)).toFixed(2)} dBFS, clipped samples ${m.clipped}, LRA ${m.lra} LU, RMS ${m.rmsDb} dB, astats peak ${m.peakDb} dB`);
  if (args.stems) log(`stems: music alone ${results.music.lufs} LUFS (tp ${results.music.truePeak}), sfx alone ${results.sfx.lufs} LUFS (tp ${results.sfx.truePeak})`);
  const errs = logs.filter((l) => /error|PAGEERROR/i.test(l)); if (errs.length) log('page errors: ' + errs.slice(0, 5).join(' | '));
}
await browser.close();
const m = results.main;
const pass = { peak: m.truePeak < -1, clipped: m.clipped === 0, loudness: Math.abs(m.lufs + 18) <= 3, voices: m.voicePeak <= 32 };
if (!args.json) log(`AU6: true-peak ${pass.peak ? 'PASS' : 'FAIL'}, clipped ${pass.clipped ? 'PASS' : 'FAIL'}, loudness ${pass.loudness ? 'PASS' : 'FAIL'}; AU5 voices<=32 ${pass.voices ? 'PASS' : 'FAIL'}`);
process.exit(pass.peak && pass.clipped && pass.loudness && pass.voices ? 0 : 1);
