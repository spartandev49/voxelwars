import { loadGltf } from './glb.mjs';
import { Q, V } from './math.mjs';
const g = loadGltf(process.argv[2]);
const names = process.argv.slice(3);
const W = new Array(g.nodes.length);
function world(i){ if(W[i]) return W[i]; const n=g.nodes[i]; const p=n.parent>=0?world(n.parent):{t:[0,0,0],q:[0,0,0,1],s:[1,1,1]};
  const t=V.add(p.t, Q.rot(p.q,[n.t[0]*p.s[0],n.t[1]*p.s[1],n.t[2]*p.s[2]])); return W[i]={t,q:Q.mul(p.q,n.q),s:[p.s[0]*n.s[0],p.s[1]*n.s[1],p.s[2]*n.s[2]]}; }
for(const n of g.nodes){ if(names.length && !names.includes(n.name)) continue; const w=world(n.index); console.log(n.name.padEnd(20), w.t.map(x=>x.toFixed(3)).join(' '), ' q', n.q.map(x=>x.toFixed(3)).join(' '), 's', n.s.map(x=>x.toFixed(3)).join(' ')); }
