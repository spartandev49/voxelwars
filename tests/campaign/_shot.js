// Shared bootstrap for the campaign screenshot entries (tools/shot_ui.mjs --entry=tests/campaign/shot_<name>.js): the real UI screens over the real
// campaign/survival/daily content instead of the mock's three-field missions. Browser-only; never imported by node tests.
import * as campaign from '../../src/ui/screens/campaign.js';
import * as briefing from '../../src/ui/screens/briefing.js';
import * as survival from '../../src/ui/screens/survival.js';
import * as daily from '../../src/ui/screens/daily.js';
import { boot } from '../ui/harness.js';
import { CAMPAIGN } from '../../src/content/era_ancient/campaign.js';
import { PUZZLES } from '../../src/content/era_ancient/puzzles.js';

export function start(screen, params, stars) {
  const ui = boot([campaign, briefing, survival, daily]);
  ui.ctx.content.campaign = CAMPAIGN; ui.ctx.content.puzzles = PUZZLES;
  ui.ctx.save.progress.set('stars', stars || { marathon_sort_of: 3, thermopylae_snack: 2, pyramid_scheme: 1, nile_crossing: 0 });
  ui.goto(screen, params);
  window.__campaignShot = ui;
  return ui;
}
