// Prints the per-rig part tables (markdown, same columns as docs/spec/rigs.md) straight from the builders, so the doc can be regenerated:
//   node tests/beasts/rigtables.mjs > /tmp/rigs_tables.md
import { buildHorse, buildCamel, buildHound, buildGoat, buildChicken, buildTrojan, buildHumLite, BUILDERS } from '../../src/content/era_ancient/beasts/index.js';
import { buildElephantRig } from '../../src/content/era_ancient/beasts/elephant.js';
import { buildChariotRig } from '../../src/content/era_ancient/beasts/chariot.js';
import { buildCatapultRig } from '../../src/content/era_ancient/beasts/catapult.js';
import { buildBallistaRig } from '../../src/content/era_ancient/beasts/ballista.js';

const f = (v) => +Number(v).toFixed(2);
function table(title, m, filter = () => true) {
  const out = [`### ${title} (${m.parts.length} parts)`, '| part | parent | grid (x,y,z) | pivot | origin | rest rx,ry,rz |', '|---|---|---|---|---|---|'];
  for (const p of m.parts) if (filter(p)) out.push(`| ${p.id} | ${p.parent || 'root'} | ${p.grid.sx},${p.grid.sy},${p.grid.sz} | ${p.pivot.map(f).join(',')} | ${p.originVox.map(f).join(',')} | ${p.rest.map(f).join(',')} |`);
  out.push('', 'attach (voxel coords in the part grid): ' + Object.entries(m.attach).filter(([k]) => !/^[a-z0-9]+_/.test(k) || /^(head_top|body_center|grip_|trunk_|seat_|howdah_|crew_|yoke_)/.test(k)).map(([k, a]) => `\`${k}\`@${a.part}(${a.at.map(f).join(',')})`).join(', '), '');
  return out.join('\n');
}
const parts = [
  table('Horse (barded variant)', buildHorse({ coat: 'bay', barded: true })), table('Camel', buildCamel({})), table('Hound', buildHound({})), table('Goat', buildGoat({})),
  table('elephant1 rig', buildElephantRig({})), table('chariot1 rig', buildChariotRig({})), table('catapult1 rig', buildCatapultRig({})), table('ballista1 rig', buildBallistaRig({})),
  table('chicken1', buildChicken({})), table('trojan1', buildTrojan({})), table('hum_lite', buildHumLite({})),
];
console.log(parts.join('\n'));
for (const id of Object.keys(BUILDERS)) { const m = BUILDERS[id](); console.log(`- ${id}: ${m.parts.length} parts, sub-rigs ${m.meta.subrigs.map((s) => `${s.prefix || '(base)'} ${s.rig} ${s.parts.length}`).join('; ')}, height ${m.meta.height} u, footprint ${m.meta.footprint.join(' x ')} u`); }
