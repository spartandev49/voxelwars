// UI19 (daily half): the Daily Skirmish plan is a pure function of the local date and content lists: same date => identical plan; different dates vary;
// the result string is plain ASCII; the streak counts consecutive days.
import assert from 'node:assert/strict';
import { dailyPlan, resultString, streakOf, dateKey, seedOf, DAILY_BUDGET } from '../../src/ui/screens/_daily_plan.js';
import { check, finish } from './_lib.mjs';

const content = {
  arenas: [{ id: 'marathon', name: 'Marathon Plain' }, { id: 'nile', name: 'Nile Delta' }, { id: 'giza', name: 'Giza Plateau' }, { id: 'troy', name: 'Siege of Troy' }, { id: 'styx', name: 'The River Styx' }, { id: 'arenalab', name: 'Arena Lab' }, { id: 'random', name: 'Random' }],
  mutators: [{ id: 'big_heads' }, { id: 'tiny_titans' }, { id: 'moon_gravity' }],
  factions: { hellenes: { name: 'Hellenes' }, romans: { name: 'Romans' }, egyptians: { name: 'Egyptians' }, persians: { name: 'Persians' }, carthage: { name: 'Carthaginians' } },
};
const a = dailyPlan('2026-10-06', content), b = dailyPlan('2026-10-06', content);
check('same date => identical plan (deterministic)', JSON.stringify(a) === JSON.stringify(b));
check('seed is the YYYYMMDD number', a.seed === 20261006 && seedOf('2026-10-06') === 20261006);
check('fixed budget', a.budget === DAILY_BUDGET && DAILY_BUDGET === 3000);
check('arena is never the editor lab or random', !['arenalab', 'random'].includes(a.arenaId));
check('two different factions', a.factionA !== a.factionB);

const days = []; for (let d = 1; d <= 30; d++) days.push(dailyPlan('2026-09-' + String(d).padStart(2, '0'), content));
check('30 days use at least 4 different arenas', new Set(days.map((p) => p.arenaId)).size >= 4, [...new Set(days.map((p) => p.arenaId))].join(','));
check('30 days use at least 4 enemy styles', new Set(days.map((p) => p.enemyStyle)).size >= 4);
check('some days have a twist mutator and some do not', days.some((p) => p.mutator) && days.some((p) => !p.mutator));
check('consecutive days differ', days.every((p, i) => i === 0 || JSON.stringify(p) !== JSON.stringify(days[i - 1])));
check('tomorrow is not identical to today', JSON.stringify(dailyPlan('2026-10-07', content)) !== JSON.stringify(a));

const names = { hellenes: 'Hellenes', persians: 'Persians' };
const plan = Object.assign({}, a, { factionA: 'hellenes', factionB: 'persians', arenaName: 'Marathon Plain' });
const s = resultString(plan, { winner: 0, time: 106, teams: [{ alive: 87, dead: 85, startCount: 172 }] }, names);
check('result string shape', /^VOXELWARS Daily 2026-10-06 \| Marathon Plain \| Hellenes vs Persians \| WIN in 1:46 \| 51% of the army left \| seed 20261006$/.test(s), s);
check('result string is plain ASCII (chat safe)', /^[\x20-\x7e]+$/.test(s));
check('loss and draw verdicts', /LOSS/.test(resultString(plan, { winner: 1, time: 5, teams: [{ alive: 0, dead: 5, startCount: 5 }] })) && /DRAW/.test(resultString(plan, { winner: -1, time: 5, teams: [{ alive: 1, dead: 4, startCount: 5 }] })));

check('streak: three consecutive days', streakOf([{ date: '2026-10-06' }, { date: '2026-10-05' }, { date: '2026-10-04' }, { date: '2026-10-01' }], '2026-10-06') === 3);
check('streak survives until the day is over (yesterday still counts)', streakOf([{ date: '2026-10-05' }, { date: '2026-10-04' }], '2026-10-06') === 2);
check('streak broken after a missed day', streakOf([{ date: '2026-10-03' }], '2026-10-06') === 0);
check('dateKey uses local date parts', dateKey(new Date(2026, 9, 6, 23, 59)) === '2026-10-06' && dateKey(new Date(2026, 0, 2)) === '2026-01-02');
assert.ok(true);
finish('daily_plan');
