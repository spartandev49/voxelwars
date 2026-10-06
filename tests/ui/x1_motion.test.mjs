// X1: Reduce Motion (in-game switch AND the OS preference) disables springs, wobble, drift and blink; UI scale, colour palettes and high contrast apply
// immediately; shake % / flash limiter sliders write their settings. (Camera shake and lightning flashes themselves live in render/, driven by those keys.)
import { open, check, finish } from './lib.mjs';

const infinite = () => document.getAnimations().filter((a) => { try { const t = a.effect.getComputedTiming(); return a.playState === 'running' && t.iterations === Infinity; } catch (e) { return false; } }).length;
const noHScroll = () => document.documentElement.scrollWidth <= window.innerWidth + 1 && Array.from(document.querySelectorAll('.vw-screen')).every((s) => s.scrollWidth <= s.clientWidth + 1);

// ---- in-game switch
let L = await open([1280, 720]);
await L.run('title'); await L.p.waitForTimeout(200);
check('motion is on by default (infinite logo/blink animations run)', (await L.ev(infinite)) > 0);
await L.ev(() => window.__ui.app.settings.set('reduceMotion', true));
await L.p.waitForTimeout(250);
check('Reduce Motion class lands on :root', await L.ev(() => document.documentElement.classList.contains('vw-reduce-motion')));
check('Reduce Motion stops every infinite animation', (await L.ev(infinite)) === 0, String(await L.ev(infinite)));
check('Reduce Motion: logo animation collapses to one instant iteration', await L.ev(() => { const cs = getComputedStyle(document.querySelector('.vw-logo')); return cs.animationIterationCount === '1' && parseFloat(cs.animationDuration) < 0.01; }));
check('Reduce Motion: button transitions are instant', await L.ev(() => parseFloat(getComputedStyle(document.querySelector('.vw-btn__face')).transitionDuration) < 0.01));
check('Reduce Motion: spring easing replaced', await L.ev(() => getComputedStyle(document.documentElement).getPropertyValue('--ease-spring').trim() === 'ease-out'));
await L.run('splash'); await L.p.waitForTimeout(200);
check('Reduce Motion: splash prompt does not blink or pulse', await L.ev(() => { const cs = getComputedStyle(document.querySelector('.vw-splash__prompt-text')); return cs.animationIterationCount === '1' && parseFloat(cs.animationDuration) < 0.01; }));
await L.ev(() => window.__ui.app.settings.set('reduceMotion', false));
await L.p.waitForTimeout(150);
check('turning it back off restores motion', (await L.ev(infinite)) > 0);

// ---- UI scale
for (const sc of [0.8, 1, 1.3]) {
  await L.ev((v) => window.__ui.app.settings.set('uiScale', v), sc);
  check(`UI scale ${sc}: html font-size = ${16 * sc}px`, (await L.ev(() => getComputedStyle(document.documentElement).fontSize)) === `${16 * sc}px`);
}
for (const name of ['title', 'quick_advanced', 'settings_graphics', 'placement', 'codex_units']) {
  await L.run(name); await L.p.waitForTimeout(150);
  check(`UI scale 130%: ${name} fits 1280x720 without horizontal scroll`, await L.ev(noHScroll));
}
await L.close();
L = await open([390, 844]);
await L.ev(() => window.__ui.app.settings.set('uiScale', 1.3));
for (const name of ['title', 'quick_advanced', 'settings_audio', 'placement', 'codex_units', 'credits']) {
  await L.run(name); await L.p.waitForTimeout(150);
  check(`UI scale 130%: ${name} fits 390x844 without horizontal scroll`, await L.ev(noHScroll));
}
await L.close();

// ---- OS preference alone
L = await open([1280, 720], { reducedMotion: true });
await L.run('title'); await L.p.waitForTimeout(200);
check('prefers-reduced-motion alone stops infinite animations', (await L.ev(infinite)) === 0);
await L.close();

// ---- palettes, contrast, shake/flash settings
L = await open([1280, 720]);
await L.run('settings_access'); await L.p.waitForTimeout(150);
const teamA = () => L.ev(() => getComputedStyle(document.documentElement).getPropertyValue('--team-a').trim());
const a0 = await teamA();
await L.ev(() => document.querySelector('#set-palette .vw-seg__opt[data-value="cvd"]').click());
const a1 = await teamA();
check('colour-blind palette changes the team colour tokens', a0 !== a1 && a1 === '#2f8cff', `${a0} -> ${a1}`);
await L.ev(() => document.querySelector('#set-palette .vw-seg__opt[data-value="contrast"]').click());
check('high-contrast palette applies', (await teamA()) === '#00e5ff');
const night0 = await L.ev(() => getComputedStyle(document.documentElement).getPropertyValue('--night').trim());
await L.ev(() => document.getElementById('set-highcontrastui').click());
await L.p.waitForTimeout(100);
const night1 = await L.ev(() => getComputedStyle(document.documentElement).getPropertyValue('--night').trim());
check('high-contrast UI darkens panels', night0 !== night1 && await L.ev(() => document.documentElement.classList.contains('vw-high-contrast')), `${night0} -> ${night1}`);
await L.p.focus('#set-shake'); await L.p.keyboard.press('Home');
check('shake slider writes settings.shake', (await L.ev(() => window.__ui.app.settings.get('shake'))) === 0);
await L.ev(() => { const t = document.getElementById('set-flashlimiter'); t.click(); });
check('flash limiter toggle writes settings.flashLimiter', (await L.ev(() => window.__ui.app.settings.get('flashLimiter'))) === false);
await L.ev(() => window.__ui.app.settings.set('palette', 'classic'));
await L.p.waitForTimeout(100);
check('palette reverts to classic', (await teamA()) !== '#00e5ff');
const errs = L.logs.filter((l) => /error/i.test(l));
check('console clean', errs.length === 0, errs.slice(0, 3).join(' | '));
await L.close();
finish('x1_motion');
