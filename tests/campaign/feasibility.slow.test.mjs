// W6 / S21 re-measurement on the CURRENT sim (slow: ~10 minutes, excluded from `gate --fast` by its name). The fast test checks the stored 20-seed bands against the
// mission data; the sim and the unit stats keep moving while other owners tune them, so this file fights 6 seeds per mission with the reference deployment ('counter')
// and the naive one ('greedy') right now and checks the two hard criteria with the tolerance of a small sample: the reference wins at least 3 of 6 (stored bands:
// >= 60% over 20), the naive deployment does not win all 6 (stored: <= 70%). A failure here means the numbers of docs/campaign_report.md no longer hold: re-run
// `node tests/campaign/run_feasibility.mjs --bots=counter,greedy,turtle --n=20` (one process per mission and bot) and then `--report`, and retune the enemy data.
import { test, finish, assert } from '../sim/_util.mjs';
import { MISSIONS } from '../../src/content/era_ancient/campaign.js';
import { sweep } from './_lib.mjs';

const N = 6;
for (const m of MISSIONS) {
  await test(m.id + ': reference deployment wins >= 3 of ' + N + ', the naive one not all ' + N + ' (now, on the current sim)', () => {
    const c = sweep(m, 'counter', N), g = sweep(m, 'greedy', N);
    console.log('  ' + m.id + ' counter ' + c.wins + '/' + N + ' greedy ' + g.wins + '/' + N);
    assert.ok(c.wins >= 3, m.id + ' reference won ' + c.wins + '/' + N);
    assert.ok(g.wins < N, m.id + ' naive deployment won ' + g.wins + '/' + N);
  });
}
finish('feasibility.slow');
