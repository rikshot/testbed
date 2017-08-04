import 'mocha';
import { assert } from 'chai';

import { View } from 'View/View';

describe('View', () => {

    it('should construct', () => {
        const view = new View();
        assert(view);
    });

});
