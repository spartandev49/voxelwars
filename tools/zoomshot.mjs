// Dev helper: crop + upscale a region of a PNG (nearest neighbour) using headless Chromium. Usage: node tools/zoomshot.mjs in.png out.png x y w h scale
import { chromium } from 'playwright-core';
import fs from 'fs';
const [inp, out, x, y, w, h, k = '4'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: Math.round(+w * +k), height: Math.round(+h * +k) } });
const data = fs.readFileSync(inp).toString('base64');
await p.setContent(`<body style="margin:0;overflow:hidden"><div style="width:${+w * +k}px;height:${+h * +k}px;overflow:hidden;position:relative"><img src="data:image/png;base64,${data}" style="position:absolute;left:${-x * k}px;top:${-y * k}px;image-rendering:pixelated;width:auto;height:auto;transform-origin:0 0;transform:scale(${k});left:0;top:0;margin-left:${-x * k}px;margin-top:${-y * k}px"></div></body>`);
await p.waitForTimeout(300); await p.screenshot({ path: out }); await b.close(); console.log('wrote', out);
