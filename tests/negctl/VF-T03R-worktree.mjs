// NC-VF-G1-worktree: the recorder no longer verifies the worktree HEAD (assertBaseline accepts any checkout) -> g1rec/refuses_wrong_worktree must go red (VF 3.6 rule 1).
export default {
  id: 'NC-VF-G1-worktree', criterion: 'VF-T03R',
  expectRed: ['VF-T03R/g1rec/refuses_wrong_worktree'],
  alsoRed: [],
  tier: 'T-full', needs: ['baseline'], costS: 60,
  mutate(c) { c.edit('tools/golden/baseline.mjs', /if \(head !== BASELINE_SHA\) throw new Error/, 'if (false) throw new Error'); },
  run: ['node', 'tests/golden/g1_record.slow.test.mjs'],
};
