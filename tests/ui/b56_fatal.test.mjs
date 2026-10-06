// B5/B6 (UI side): the fatal panel names the cause, offers safe-mode instructions/retry, and its Copy button works (clipboard or selected-text fallback).
// The loader's CDN fallback chain itself is COORD's; this verifies the panel those paths render.
import { open, check, finish } from './lib.mjs';

const L = await open([1280, 720]);
const p = L.p;
await L.ev(() => { const d = document.createElement('div'); d.id = 'fatal-host'; document.body.appendChild(d); });
// 1. WebGL2 missing
await L.ev(() => window.__ui.registry.fatal.renderFatal(document.getElementById('fatal-host'), { kind: 'webgl2', message: 'getContext("webgl2") returned null', diagnostics: { gl: null, ua: 'x' } }));
const t1 = await L.ev(() => document.getElementById('vw-fatal').textContent);
check('B6: panel names WebGL 2 as the cause', /WebGL 2 is not available/i.test(t1));
check('B6: panel offers Safe mode instructions (and explains it needs WebGL 2)', /safe mode/i.test(t1) && /hardware acceleration/i.test(t1));
check('B6: no useless Safe-mode button when WebGL 2 is the cause', await L.ev(() => !document.getElementById('fatal-safe')));
check('B5/B6: the panel is a full-screen alertdialog, not a white screen', await L.ev(() => { const e = document.getElementById('vw-fatal'); const r = e.getBoundingClientRect(); return e.getAttribute('role') === 'alertdialog' && r.width >= innerWidth - 1 && r.height >= innerHeight - 1; }));
// copy: grant clipboard and read back
await p.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://t' }).catch(() => {});
await p.click('#fatal-copy'); await p.waitForTimeout(250);
const clip = await L.ev(async () => { try { return await navigator.clipboard.readText(); } catch (e) { return 'ERR ' + e.message; } });
check('Copy button puts the diagnostics on the clipboard', /webgl2/i.test(clip) && /getContext/.test(clip), clip.slice(0, 80));
check('Copy confirms to the user', await L.ev(() => /copied/i.test(document.querySelector('.vw-fatal__status').textContent)));
// 2. clipboard denied -> text is selected, user told to press Ctrl/Cmd+C
await L.ev(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true }); document.execCommand = () => false; });
await p.click('#fatal-copy'); await p.waitForTimeout(200);
check('Copy fallback: text selected + instruction shown', await L.ev(() => { const ta = document.getElementById('fatal-diag'); return ta.selectionEnd - ta.selectionStart === ta.value.length && /Ctrl\/Cmd\+C/.test(document.querySelector('.vw-fatal__status').textContent); }));
// 3. CDN failure: safe mode button
await L.ev(() => { document.getElementById('vw-fatal').remove(); window.__calls = []; window.__ui.registry.fatal.renderFatal(document.getElementById('fatal-host'), { kind: 'cdn', message: 'three.min.js failed on cdnjs, jsDelivr, unpkg', onSafeMode: () => window.__calls.push('safe'), onReload: () => window.__calls.push('reload') }); });
check('B5: CDN failure shows its cause and steps', await L.ev(() => /required library failed to load/i.test(document.getElementById('vw-fatal').textContent)));
await p.click('#fatal-safe'); await p.click('#fatal-reload');
check('safe-mode and reload buttons call their handlers', (await L.ev(() => window.__calls)).join() === 'safe,reload');
// 4. unknown kind with a custom cause, ctx-free call (boot-time)
await L.ev(() => { document.getElementById('vw-fatal').remove(); window.__ui.registry.fatal.renderFatal(document.getElementById('fatal-host'), { cause: 'Out of cheese', diagnostics: 'x=1' }); });
check('unknown errors render the given cause text', await L.ev(() => document.querySelector('.vw-fatal__cause').textContent === 'Out of cheese'));
// text is plain text only (XSS)
await L.ev(() => { document.getElementById('vw-fatal').remove(); window.__ui.registry.fatal.renderFatal(document.getElementById('fatal-host'), { cause: '<img src=x onerror=window.__pwn=1>', message: '<b>bold?</b>', diagnostics: '<script>window.__pwn=2</script>' }); });
check('fatal panel renders hostile strings as text', await L.ev(() => !window.__pwn && !document.querySelector('#vw-fatal img') && document.querySelector('.vw-fatal__cause').textContent.includes('<img')));
const errs = L.logs.filter((l) => /error/i.test(l) && !/denied/i.test(l));
check('console clean', errs.length === 0, errs.slice(0, 3).join(' | '));
await L.close();
finish('b56_fatal');
