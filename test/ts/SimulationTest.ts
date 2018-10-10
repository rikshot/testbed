import * as tape from 'tape';

import { Simulation } from 'Sandbox/Simulation';

tape('Simulation', (t) => {

    t.test('should construct', (st) => {
        const simulation = new Simulation(1, 1);
        st.ok(simulation);
        st.end();
    });

});
