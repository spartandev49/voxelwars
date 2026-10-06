// _strings.js: user-visible strings of the battle-side screens that live in code as defaults and can be overridden from content data (spec rule 9):
//   ctx.content.humor.uiBattle[section] = { key: 'text' | (…args) => 'text' }.  getTB(ctx, 'puzzles', DEFAULTS) merges the override over the defaults without mutating either.
export function getTB(ctx, section, defaults) {
  let o = null;
  try { o = ctx.content.humor.uiBattle[section]; } catch (e) { o = null; }
  return o && typeof o === 'object' ? Object.assign({}, defaults, o) : defaults;
}
