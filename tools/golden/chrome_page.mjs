// Chromium plumbing of the Chromium-driven golden tools (G5 fixture producer, G6 Chromium column): the artifact page served under the artifact CSP wrapper on a loopback
// port, three/gsap from .cache/cdn, audio from assets/, fonts empty, every other request aborted; a fresh browser context per page (empty localStorage); console
// errors and warnings, page errors, CSP violations and failed requests are collected in `problems`.
// Owner: TOOLS-GOLDEN. Same wrapper text as tools/smoke.mjs and tools/golden/g1_chromium.mjs (VF 3.9: the page runs under the artifact CSP).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { chromium } from 'playwright-core';
import { CHROMIUM, CHROMIUM_ARGS, MAIN_ROOT, ROOT } from '../lib/paths.mjs';

export const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src blob: 'self'; base-uri 'none'; form-action 'none'";
export const wrapPage = (h) => (/^\s*<!doctype/i.test(h) ? h : '<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + h + '</body></html>');
const MIME = { '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json', '.ogg': 'audio/ogg', '.js': 'text/javascript' };
export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

/** The Ancient v8 page, `release/v8/index.html`, verified against `release/v8/PAGE.sha256` (VF-L04 proves a build of the baseline sources reproduces it byte for byte). */
export function baselinePageHtml() {
  const dir = path.join(ROOT, 'release', 'v8'), bytes = fs.readFileSync(path.join(dir, 'index.html')), want = fs.readFileSync(path.join(dir, 'PAGE.sha256'), 'utf8').trim().split(/\s+/)[0];
  if (sha256(bytes) !== want) throw new Error(`release/v8/index.html does not match release/v8/PAGE.sha256 (${sha256(bytes).slice(0, 12)} vs ${want.slice(0, 12)})`);
  return { html: bytes.toString('utf8'), sha256: sha256(bytes), bytes: bytes.length };
}

function serve(html) {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/' || u.pathname === '/index.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP }); res.end(wrapPage(html)); return; }
    const f = path.join(MAIN_ROOT, decodeURIComponent(u.pathname));
    if (f.startsWith(path.join(MAIN_ROOT, 'assets')) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); return; }
    res.writeHead(404); res.end('not found');
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port })));
}

/**
 * Open `html` in a fresh Chromium context (empty localStorage) and wait for body[data-vw-ready="1"].
 * -> { page, browser, ctx, url, problems:[string], engineVersion, close() }   `problems` collects console errors/warnings, page errors, CSP violations, failed requests.
 */
export async function openPage(html, { viewport = { width: 1280, height: 720 }, readyTimeoutMs = 90000 } = {}) {
  const cdn = path.join(MAIN_ROOT, '.cache', 'cdn');
  const { srv, port } = await serve(html);
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: CHROMIUM_ARGS });
  const ctx = await browser.newContext({ viewport }), page = await ctx.newPage(), problems = [];
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning') problems.push(`console.${t}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('crash', () => problems.push('page crashed (renderer process died)'));
  browser.on('disconnected', () => problems.push('browser disconnected'));
  page.on('requestfailed', (r) => { const u = r.url(); if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return; problems.push('requestfailed: ' + u + ' ' + (r.failure() && r.failure().errorText)); });
  await page.exposeFunction('__vwCsp', (v) => problems.push('CSP violation: ' + v));
  await page.addInitScript(() => { document.addEventListener('securitypolicyviolation', (e) => window.__vwCsp(e.violatedDirective + ' blocked ' + e.blockedURI)); });
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1') return route.continue();
    if (/fonts\.(googleapis|gstatic)\.com/.test(u.host)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    for (const k of ['three.min.js', 'gsap.min.js']) if (u.pathname.endsWith(k)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(cdn, k)) });
    return route.abort();
  });
  const url = `http://127.0.0.1:${port}/index.html`;
  const close = async () => { try { await ctx.close(); } catch { /* already closed */ } try { await browser.close(); } catch { /* ditto */ } srv.close(); };
  try {
    await page.goto(url);
    await page.waitForSelector('body[data-vw-ready="1"]', { timeout: readyTimeoutMs });
  } catch (e) { await close(); throw e; }
  return { page, browser, ctx, url, problems, engineVersion: browser.version(), close };
}
