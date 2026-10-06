// Tiny WAV writer/reader for the audio test fixtures (PCM16, mono or stereo). Node only.
export function writeWav(channels, sr) {
  const nc = channels.length, n = channels[0].length, data = Buffer.alloc(44 + n * nc * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + n * nc * 2, 4); data.write('WAVE', 8); data.write('fmt ', 12);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(nc, 22); data.writeUInt32LE(sr, 24); data.writeUInt32LE(sr * nc * 2, 28); data.writeUInt16LE(nc * 2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(n * nc * 2, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(channels[c][i] * 32767))), 44 + (i * nc + c) * 2);
  return data;
}
export function readWav(buf) {
  const b = Buffer.from(buf);
  if (b.toString('ascii', 0, 4) !== 'RIFF') return null;
  const nc = b.readUInt16LE(22), sr = b.readUInt32LE(24), n = (b.length - 44) / (nc * 2) | 0;
  const ch = []; for (let c = 0; c < nc; c++) ch.push(new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) ch[c][i] = b.readInt16LE(44 + (i * nc + c) * 2) / 32767;
  return { channels: ch, sr };
}
export const sine = (f, sec, sr = 22050, amp = 0.5) => { const x = new Float32Array(Math.round(sec * sr)); for (let i = 0; i < x.length; i++) x[i] = Math.sin(2 * Math.PI * f * i / sr) * amp * Math.min(1, i / 200) * Math.min(1, (x.length - i) / 200); return x; };
export const noiseBurst = (sec, sr = 22050, amp = 0.5, seed = 1) => { let s = seed; const x = new Float32Array(Math.round(sec * sr)); for (let i = 0; i < x.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; x[i] = ((s / 4294967296) * 2 - 1) * amp * Math.exp(-i / sr / (sec / 4)); } return x; };
