// UI copy hygiene (spec/humor.md + AGENTS rules): all strings non-empty, no markup, no emoji, sane lengths; getT merges HUMOR overrides without mutating T.
import assert from 'node:assert';
import { T, getT } from '../../src/ui/strings.js';

const leaves = [];
(function walk(o, path) {
  if (typeof o === 'string') { leaves.push([path, o]); return; }
  if (Array.isArray(o)) { o.forEach((x, i) => walk(x, path + '[' + i + ']')); return; }
  if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], path ? path + '.' + k : k);
})(T, '');
assert.ok(leaves.length > 300, 'expected a few hundred strings, got ' + leaves.length);
const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
for (const [p, s] of leaves) {
  assert.ok(s.trim().length > 0, p + ' is empty');
  assert.ok(!/<[a-z!/][^>]*>/i.test(s), p + ' contains markup');
  assert.ok(!emoji.test(s), p + ' contains an emoji');
  assert.ok(!/\b(TODO|FIXME|lorem)\b/i.test(s), p + ' is a placeholder');
  assert.ok(s.length <= 320, `${p} is too long (${s.length})`);
}
// function strings behave
assert.equal(T.quick.recommended(3000), 'Recommended budget: 3,000 drachmae');
assert.equal(T.placement.count_(37, 300), '37 / 300');
assert.match(T.title.badgeStars(6, 27), /6\/27/);
assert.equal(T.splash.prompt, 'PRESS ANY KEY TO ENTER THE ARENA');
assert.match(T.title.roadmap, /Medieval Era \(coming later\)/);
// getT
assert.equal(getT({}), T, 'no overrides: same object');
const merged = getT({ content: { humor: { ui: { splash: { tag: 'Custom tag' } }, settingsJokes: { graphics: { quality: 'Fancy preset' } } } } });
assert.equal(merged.splash.tag, 'Custom tag');
assert.equal(merged.settings.graphics.quality, 'Fancy preset');
assert.equal(merged.splash.prompt, T.splash.prompt, 'untouched keys survive the merge');
assert.equal(T.splash.tag, 'A voxel battle simulator of questionable historical accuracy', 'T itself is never mutated');
// humour quota sanity: the headline jokes exist
for (const k of ['potato', 'papyrus', 'marble', 'olympian']) assert.ok(T.settings.graphics.presetSub[k]);
assert.equal(T.quick.corpsesOpts.none, "Pretend they're napping");
assert.equal(T.quick.difficulties.easy, 'Peasant Mode');
console.log(`strings: ${leaves.length} strings checked, all passed`);
