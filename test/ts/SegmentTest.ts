import * as tape from 'tape';

import { Vector } from 'Sandbox/Vector';
import { Segment } from 'Sandbox/Segment';

tape('Segment', (t) => {

    t.test('should construct', (st) => {
        const segment = new Segment(new Vector(), new Vector());
        st.ok(segment);
        st.end();
    });

    t.test('should get middle', (st) => {
        const segment = new Segment(new Vector(10, 10), new Vector(20, 10));
        st.deepEqual(segment.middle(), new Vector(15, 10));
        st.end();
    });

    t.test('should get closest to vector', (st) => {
        const segment = new Segment(new Vector(10, 10), new Vector(20, 10));
        st.deepEqual(segment.closest(new Vector(12.5, 12.5)), new Vector(12.5, 10));
        st.end();
    });

    t.test('should get closest vector to segment', (st) => {
        const segment1 = new Segment(new Vector(10, 10), new Vector(20, 10));
        const segment2 = new Segment(new Vector(10, 20), new Vector(10, 30));
        st.deepEqual(segment1.closest(segment2), new Vector(10, 10));
        st.end();
    });

    t.test('should get closest segment to segment', (st) => {
        const segment1 = new Segment(new Vector(10, 10), new Vector(50, 10));
        const segment2 = new Segment(new Vector(20, 20), new Vector(40, 20));
        st.deepEqual(Segment.Closest(segment1, segment2), new Segment(new Vector(20, 10), new Vector(40, 10)));
        st.end();
    });

    t.test('should get distance', (st) => {
        const segment = new Segment(new Vector(10, 10), new Vector(20, 10));
        st.equal(segment.distance(new Vector(10, 20)), 10);
        st.end();
    });

});
