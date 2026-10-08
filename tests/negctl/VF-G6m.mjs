// Negative control of the G6 replay in the default_meta regime (criterion VF-G6m, slow tier): one recorded value of the default_meta record differs -> the chain label goes red.
// (The label-by-label faults are the ones of VF-G6, whose test file is the same; this proves the default_meta record is really the one being compared.)
import { canonicalJSON } from '../../tools/lib/records.mjs';
const REC = 'tests/golden/g6_campaign.node.default_meta.json';
export default {
  id: 'NC-VF-67m', criterion: 'VF-G6m',
  expectRed: ['VF-G6m/chain'],
  alsoRed: [],
  tier: 'T-full', needs: [], costS: 30,
  mutate(c) { c.edit(REC, /^[\s\S]*$/, (text) => { const j = JSON.parse(text); j.data.results.alps_elephant.chain[0] += 1; return canonicalJSON(j) + '\n'; }); },
  run: ['node', 'tests/golden/g6_campaign.test.mjs', '--regime=default_meta'],
};
