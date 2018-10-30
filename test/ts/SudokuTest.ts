import * as tape from 'tape';

import { Candidates } from 'Sudoku/Candidates';
import { Grid } from 'Sudoku/Grid';

tape('Sudoku', (t) => {

    t.test('Candidates', (st) => {

        const candidates = new Candidates();

        t.test('should be full', (sst) => {
            sst.equal(candidates.some(), true);
            sst.equal(candidates.get(), 512);
            sst.end();
        });

        t.test('should be empty', (sst) => {
            candidates.unset();
            sst.equal(candidates.some(), false);
            sst.equal(candidates.get(3), false);
            sst.end();
        });

        t.test('should set', (sst) => {
            candidates.set(3);
            sst.equal(candidates.some(), true);
            sst.equal(candidates.get(3), true);
            sst.end();
        });

        t.test('should unset', (sst) => {
            candidates.unset(3);
            sst.equal(candidates.some(), false);
            sst.equal(candidates.get(3), false);
            sst.end();
        });

        st.end();
    });

    t.test('should construct', (st) => {
        const sudoku = new Grid();
        st.ok(sudoku);
        st.end();
    });

    t.test('should construct empty', (st) => {
        const sudoku = new Grid('000000000000000000000000000000000000000000000000000000000000000000000000000000000');
        st.ok(sudoku.valid());
        st.ok(!sudoku.complete());
        st.end();
    });

    t.test('should validate', (st) => {
        const sudoku = new Grid('060000300400700000000000080000008012500600000000000050082000700000500600000010000');
        st.ok(sudoku.valid());
        st.ok(!sudoku.complete());
        st.end();
    });

});
