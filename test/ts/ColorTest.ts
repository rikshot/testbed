import 'mocha';
import { assert } from 'chai';

import { Color } from 'Fractal/Color';

describe('Color', () => {

    it('should construct', () => {
        const color = new Color(0, 0, 0);
        assert(color);
    });

    it('should return components', () => {
        const color = new Color(1, 2, 3, 4);
        assert.equal(color.red(), 1);
        assert.equal(color.green(), 2);
        assert.equal(color.blue(), 3);
        assert.equal(color.alpha(), 4);
    });

});
