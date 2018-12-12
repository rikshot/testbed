import * as tape from 'tape';

import { Color } from 'Sandbox/Color.js';

tape('Color', (t) => {

    t.test('should construct', (st) => {
        const color = new Color(0, 0, 0);
        st.assert(color);
        st.end();
    });

    t.test('should return components', (st) => {
        const color = new Color(1, 2, 3, 4);
        st.equal(color.red(), 1);
        st.equal(color.green(), 2);
        st.equal(color.blue(), 3);
        st.equal(color.alpha(), 4);
        st.end();
    });

});
