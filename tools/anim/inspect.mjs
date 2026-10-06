// usage: node tools/anim/inspect.mjs <glb>  -> prints skeleton hierarchy, rest pose and animation list
import { loadGltf, nodeInfo, prepareAnimation } from './glb.mjs';
const g = loadGltf(process.argv[2]);
console.log('nodes', g.nodes.length, 'skins', g.skins.length, 'anims', g.animations.length, 'meshes', (g.json.meshes||[]).length);
console.log('generator:', g.json.asset);
console.log(nodeInfo(g));
for (const s of g.skins) console.log('skin', s.name, 'joints', s.joints.length, 'root', s.skeleton);
const out = [];
for (const a of g.animations) { const p = prepareAnimation(g, a); out.push(`${a.name}\t${a.channels.length}ch\t${p.duration.toFixed(3)}s\t${p.tracks[0]?.n}keys`); }
console.log(out.join('\n'));
