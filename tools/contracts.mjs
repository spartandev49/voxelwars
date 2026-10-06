// Contract validators (spec §13 Q1): cross-module facts that no single unit test owns. Usage: node tools/contracts.mjs [--strict]
// Reports every violation; exit 1 on any hard failure. "Soft" findings (units still on the fallback model, ...) fail only with --strict
// (the gate uses --strict once all unit models have landed: see QA).
import { buildContent } from '../src/content/era_ancient/content.js';
import * as BP from '../src/content/era_ancient/blueprints.js';
import { abilityRegistry } from '../src/sim/abilities/index.js';
import { RECIPES, generateArena } from '../src/world/gen.js';
import { ARENAS } from '../src/content/era_ancient/arenas.js';
import { MUTATORS } from '../src/sim/mutators.js';
import { MUTATORS_TEXT } from '../src/content/era_ancient/humor/mutators_text.js';
import { ACHIEVEMENTS } from '../src/content/era_ancient/humor/achievements.js';
import { PROP_CATALOG } from '../src/content/era_ancient/props/catalog.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const strict = process.argv.includes('--strict');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hard = [], soft = [];
const H = (m) => hard.push(m), S = (m) => soft.push(m);

const content = buildContent();
content.setCompiler(BP.compileSoldier);
const defs = content.defs, ids = Object.keys(defs);
const reg = abilityRegistry ? (typeof abilityRegistry === 'function' ? abilityRegistry() : abilityRegistry) : null;

// ---- units: stats, text, model, abilities
for (const id of ids) {
  const d = defs[id];
  if (!(d.cost > 0 && d.hp > 0 && d.speed > 0 && d.radius > 0)) H(`unit ${id}: cost/hp/speed/radius must be positive`);
  const t = d.text || {};
  for (const k of ['blurb', 'lore', 'codexJoke']) if (!t[k] || String(t[k]).length < 6) H(`unit ${id}: text.${k} missing`);
  if (!Array.isArray(t.deaths) || t.deaths.length < 3) H(`unit ${id}: needs >= 3 death quotes`);
  if (!Array.isArray(t.taunts) || t.taunts.length < 2) H(`unit ${id}: needs >= 2 taunts`);
  if ((!d.model || !d.model.kind) && !content.BUILDERS[id]) S(`unit ${id}: no model (fallback model in use)`);
  else {
    try {
      const r = content.modelFor(d, null);
      if (!r || !r.model) H(`unit ${id}: modelFor returned nothing`);
      else if (r.model.parts.length > 48) H(`unit ${id}: ${r.model.parts.length} parts (max 48)`);
      else if (r.model.meta && r.model.meta.fallback) S(`unit ${id}: fallback model`);
    } catch (e) { H(`unit ${id}: model build threw ${e.message}`); }
  }
  for (const ab of d.abilities || []) {
    const key = ab.id || ab.cls || ab.class;
    if (reg && typeof reg.has === 'function' ? !reg.has(key) : (reg && !(key in reg) && !(reg.get && reg.get(key)))) H(`unit ${id}: unknown ability ${key}`);
  }
}
if (ids.length !== 43) H(`roster must have 43 units, found ${ids.length}`);

// ---- arenas: presets <-> recipes, generation, zones
for (const a of ARENAS) {
  if (a.id !== 'random' && !RECIPES.includes(a.recipe)) H(`arena preset ${a.id}: unknown recipe ${a.recipe}`);
  if (!a.name || !a.blurb || !Array.isArray(a.tactics)) H(`arena preset ${a.id}: name/blurb/tactics`);
}
for (const r of RECIPES) {
  if (r === 'random') continue;
  try {
    const arena = generateArena(r, 'small', 1);
    if (!arena.zones || !arena.zones.A || !arena.zones.B) H(`arena ${r}: zones A/B missing`);
    for (const p of arena.props || []) if (!PROP_CATALOG[p.t]) H(`arena ${r}: prop type ${p.t} not in the catalog`);
  } catch (e) { H(`arena ${r}: generation threw ${e.message}`); }
}

// ---- mutators: sim, text, content must agree
const sim = MUTATORS.map((m) => m.id).sort().join(), txt = MUTATORS_TEXT.map((m) => m.id).sort().join(), cm = content.mutators.map((m) => m.id).sort().join();
if (sim !== txt || sim !== cm) H(`mutator ids differ: sim[${sim}] text[${txt}] content[${cm}]`);

// ---- achievements: unique ids, test functions
const seen = new Set();
for (const a of ACHIEVEMENTS) { if (seen.has(a.id)) H(`achievement ${a.id} duplicated`); seen.add(a.id); if (typeof a.test !== 'function') H(`achievement ${a.id}: no test()`); if (!a.name || !a.desc) H(`achievement ${a.id}: name/desc`); }

// ---- assets: every manifest entry exists on disk
const mf = path.join(root, 'assets/manifest.json');
if (fs.existsSync(mf)) {
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  for (const kind of ['sfx', 'music']) for (const e of m[kind] || []) {
    const rel = e.path || `audio/${kind}/${e.file}`; const p = path.join(root, rel.startsWith('assets/') ? rel : 'assets/' + rel);
    if (!fs.existsSync(p)) H(`manifest ${kind} ${e.id || e.file}: file missing ${rel}`);
  }
}

// ---- docs the build refers to
for (const f of ['assets/CREDITS.md', 'docs/spec.md', 'docs/verification.md']) if (!fs.existsSync(path.join(root, f))) H(`missing ${f}`);

for (const m of soft) console.log('  soft:', m);
for (const m of hard) console.log('  FAIL:', m);
const bad = hard.length + (strict ? soft.length : 0);
console.log(bad ? `contracts: ${hard.length} failure(s), ${soft.length} soft finding(s)` : `contracts OK (${ids.length} units, ${ARENAS.length} arena presets, ${soft.length} soft finding(s))`);
process.exit(bad ? 1 : 0);
