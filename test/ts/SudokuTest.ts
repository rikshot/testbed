import { assert } from 'chai';
import 'mocha';

import { Candidates } from 'Sudoku/Candidates';
import { Grid } from 'Sudoku/Grid';

describe('Sudoku', () => {

    describe('Candidates', () => {

        const candidates = new Candidates();

        it('should be full', () => {
            assert.equal(candidates.some(), true);
            assert.equal(candidates.get(), 512);
        });

        it('should be empty', () => {
            candidates.unset();
            assert.equal(candidates.some(), false);
            assert.equal(candidates.get(3), false);
        });

        it('should set', () => {
            candidates.set(3);
            assert.equal(candidates.some(), true);
            assert.equal(candidates.get(3), true);
        });

        it('should unset', () => {
            candidates.unset(3);
            assert.equal(candidates.some(), false);
            assert.equal(candidates.get(3), false);
        });

    });

    it('should construct', () => {
        const sudoku = new Grid();
        assert(sudoku);
    });

    it('should construct empty', () => {
        const sudoku = new Grid('000000000000000000000000000000000000000000000000000000000000000000000000000000000');
        assert(sudoku.valid());
        assert(!sudoku.complete());
    });

    it('should validate', () => {
        const sudoku = new Grid('060000300400700000000000080000008012500600000000000050082000700000500600000010000');
        assert(sudoku.valid());
        assert(!sudoku.complete());
    });

});
