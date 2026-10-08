// Fixture of tests/golden/negctl_lite.test.mjs: two independent checks whose result is decided by flag.txt ('red-a' fails alpha, 'red-b' fails beta). other.txt is irrelevant on purpose.
import fs from 'node:fs';
import { criterion } from '../../../lib/criteria.mjs';
const flag = fs.readFileSync(new URL('./flag.txt', import.meta.url), 'utf8');
const c = criterion('SYN-1', { tier: 'T-fast' });
c.soft('alpha', !flag.includes('red-a'));
c.soft('beta', !flag.includes('red-b'));
c.done();
