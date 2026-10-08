// G6 in the default_meta regime (VF-D4: G6 is recorded under both timing regimes; baked is the golden, default_meta keeps the provenance and refactor checks). Slow tier
// (named *.slow.test.mjs, so the fast gate skips it): the same test file as the baked replay, run in its own process with --regime=default_meta (criterion VF-G6m).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [path.join(here, 'g6_campaign.test.mjs'), '--regime=default_meta'], { stdio: 'inherit', env: process.env });
process.exit(r.status === null ? 1 : r.status);
