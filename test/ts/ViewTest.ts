import * as tape from 'tape';

import { View } from 'View/View';

tape('View', (t) => {

    t.test('should construct', (st) => {
        const view = new View();
        st.ok(view);
        st.end();
    });

});
