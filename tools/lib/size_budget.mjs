// Size budget of the packed page (plan 0.4, AR 3.11.2; owner TOOLS-GATE). Pure: used by build.mjs --budget and by the gate step `size`.
export const FRAGMENT_FAIL = 5000000;     // minified fragment, bytes; raising it is the user's decision (goes in the final message)
export const FRAGMENT_WARN = 4500000;
export const FILES_FAIL = 500;            // server-side published set INCLUDING the page (hard server cap is 511 per version)
export const DELTA_WARN = 300000;         // growth of the fragment between two recorded gate runs, advisory

/**
 * @param {{minified:boolean, fragmentBytes:number, publishedFiles:number}} report  `publishedFiles` = files.json entries (without the page)
 * @param {{fragmentBytes:number}|null} prev  previous record of the same flavour
 * @returns {{status:'PASS'|'AMBER'|'FAIL', checks:{label:string, ok:boolean, level:'fail'|'warn', msg:string}[]}}
 */
export function checkBudget(report, prev) {
  const checks = [];
  if (report.minified) {
    checks.push({ label: 'fragment_cap', ok: report.fragmentBytes <= FRAGMENT_FAIL, level: 'fail', msg: `minified fragment ${report.fragmentBytes} B > ${FRAGMENT_FAIL} B` });
    checks.push({ label: 'fragment_warn', ok: report.fragmentBytes <= FRAGMENT_WARN, level: 'warn', msg: `minified fragment ${report.fragmentBytes} B > ${FRAGMENT_WARN} B (warn)` });
    if (prev && prev.fragmentBytes) checks.push({ label: 'delta_warn', ok: report.fragmentBytes - prev.fragmentBytes <= DELTA_WARN, level: 'warn', msg: `fragment grew ${report.fragmentBytes - prev.fragmentBytes} B since the previous record (> ${DELTA_WARN})` });
  }
  checks.push({ label: 'files_cap', ok: report.publishedFiles + 1 <= FILES_FAIL, level: 'fail', msg: `published set ${report.publishedFiles + 1} files (with the page) > ${FILES_FAIL}` });
  const failed = checks.filter((c) => !c.ok);
  return { status: failed.some((c) => c.level === 'fail') ? 'FAIL' : failed.length ? 'AMBER' : 'PASS', checks };
}
