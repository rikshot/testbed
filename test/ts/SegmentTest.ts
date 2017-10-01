import 'mocha';
import { assert } from 'chai';

import { Vector } from 'Sandbox/Vector';
import { Segment } from 'Sandbox/Segment';

describe('Segment', () => {

    it('should construct', () => {
        const segment = new Segment(new Vector(), new Vector());
        assert(segment);
    });

    it('should get middle', () => {
        const segment = new Segment(new Vector(10, 10), new Vector(20, 10));
        assert.deepEqual(segment.middle(), new Vector(15, 10));
    });

    it('should get closest to vector', () => {
        const segment = new Segment(new Vector(10, 10), new Vector(20, 10));
        assert.deepEqual(segment.closest(new Vector(12.5, 12.5)), new Vector(12.5, 10));
    });

    it('should get closest vector to segment', () => {
        const segment1 = new Segment(new Vector(10, 10), new Vector(20, 10));
        const segment2 = new Segment(new Vector(10, 20), new Vector(10, 30));
        assert.deepEqual(segment1.closest(segment2), new Vector(10, 10));
    });

    it('should get closest segment to segment', () => {
        const segment1 = new Segment(new Vector(10, 10), new Vector(50, 10));
        const segment2 = new Segment(new Vector(20, 20), new Vector(40, 20));
        assert.deepEqual(Segment.Closest(segment1, segment2), new Segment(new Vector(20, 10), new Vector(40, 10)));
    });

    it('should get distance', () => {
        const segment = new Segment(new Vector(10, 10), new Vector(20, 10));
        assert.equal(segment.distance(new Vector(10, 20)), 10);
    });

});
