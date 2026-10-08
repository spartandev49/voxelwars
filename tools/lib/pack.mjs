// Reading the Artifact fragment that tools/build.mjs writes (docs/eras/spec/VF.md 3.5 step 2).
//
// The fragment = <title/links> <style> <script>cdn loader</script> boot markup <noscript> <script type="text/plain" id="vw-pack">BASE64(deflate-raw(payload))</script> <script>pack loader</script>.
// The payload = `window.__VW_MANIFEST__=<json>;window.__VW_CREDITS__=<json>;window.__VW_CORE_AUDIO__=<json>;window.__VW_UAL_CLIPS__=<json>;window.__VW_FILES__=<json>;\n<js bundle>`.
// The artifact host wraps the fragment in a skeleton page, so every function here searches by markers instead of assuming offsets.
import zlib from 'node:zlib';
import crypto from 'node:crypto';

export const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');
export const GLOBALS = ['__VW_MANIFEST__', '__VW_CREDITS__', '__VW_CORE_AUDIO__', '__VW_UAL_CLIPS__', '__VW_FILES__'];
export const BUILD_DATE_RE = /buildDate:\s*"(\d{4}-\d{2}-\d{2})"/;
const PACK_RE = /<script type="text\/plain" id="vw-pack">([^<]*)<\/script>/;

/** End offset of the JSON value (object, array, string or a bare literal up to ';') starting at `p`. */
export function scanJson(text, p) {
  const c = text[p];
  if (c === '{' || c === '[') {
    let depth = 0;
    for (let i = p; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') { for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === '\\') i++; }
      else if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') { if (--depth === 0) return i + 1; }
    }
    throw new Error('unterminated JSON value at ' + p);
  }
  if (c === '"') { let i = p + 1; for (; i < text.length && text[i] !== '"'; i++) if (text[i] === '\\') i++; return i + 1; }
  const e = text.indexOf(';', p);
  if (e < 0) throw new Error('unterminated literal at ' + p);
  return e;
}

/** Pieces of a fragment or of a whole hosted page: { b64, payload (Buffer), styles[], loaders[] } ; throws when there is no vw-pack. */
export function extractPack(pageText) {
  const m = PACK_RE.exec(pageText);
  if (!m) throw new Error('no <script type="text/plain" id="vw-pack"> in the page');
  const payload = zlib.inflateRawSync(Buffer.from(m[1].trim(), 'base64'));
  const styles = [...pageText.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((x) => x[1]);
  const loaders = [...pageText.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]);
  return { b64: m[1], payload, styles, loaders, packStart: m.index, packEnd: m.index + m[0].length };
}

/** Split the inflated payload into its named parts (exact byte slices of the UTF-8 text). */
export function splitPayload(payloadBuf) {
  const text = payloadBuf.toString('utf8'), parts = {};
  let p = 0;
  for (const g of GLOBALS) {
    const head = `window.${g}=`;
    if (!text.startsWith(head, p)) throw new Error(`payload does not continue with ${head} at ${p}`);
    p += head.length;
    const e = scanJson(text, p);
    parts[g.replace(/^__VW_|__$/g, '').toLowerCase()] = text.slice(p, e);
    if (text[e] !== ';') throw new Error(`expected ';' after ${g} at ${e}`);
    p = e + 1;
  }
  if (text[p] !== '\n') throw new Error('expected a newline between the globals and the bundle');
  parts.bundle = text.slice(p + 1);
  const d = BUILD_DATE_RE.exec(parts.bundle);
  return { parts, buildDate: d ? d[1] : null };
}

/** { name: {bytes, sha256} } of the pack payload parts, plus payload totals; `components` of a full fragment add the style and the two loaders. */
export function describePack(pageText, { includeLoose = true } = {}) {
  const ex = extractPack(pageText), sp = splitPayload(ex.payload);
  const comp = {};
  for (const [name, text] of Object.entries(sp.parts)) { const b = Buffer.from(text, 'utf8'); comp[name] = { bytes: b.length, sha256: sha256(b) }; }
  const out = { payload: { bytes: ex.payload.length, sha256: sha256(ex.payload) }, buildDate: sp.buildDate, components: comp };
  if (includeLoose) {
    out.styles = ex.styles.map((s) => ({ bytes: Buffer.byteLength(s), sha256: sha256(s) }));
    out.loaders = ex.loaders.map((s) => ({ bytes: Buffer.byteLength(s), sha256: sha256(s) }));
  }
  return out;
}
