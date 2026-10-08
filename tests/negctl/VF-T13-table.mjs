// NC-VF-T13-table: id ranges of the ER table (AR-T01..T05) expand to their first member only.
export default {
  id: 'NC-VF-T13-table', criterion: 'VF-T13',
  expectRed: ['VF-T13/er_table_expand_ids'],
  alsoRed: ['VF-T13/er_table_er1_members', 'VF-T13/er_table_committed_file_is_current', 'VF-T13/er_table_29_rows_with_owner_first_and_negctl'],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
  c.edit('tools/lib/er_rollup.mjs', /n <= to; n\+\+\) ids\.push/, 'n <= from; n++) ids.push');
  },
  run: ['node', 'tests/verify/criteria.test.mjs'],
};
