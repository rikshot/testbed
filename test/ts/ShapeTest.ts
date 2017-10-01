import 'mocha';
import { assert } from 'chai';

import { Vector } from 'Sandbox/Vector';
import { Rectangle } from 'Sandbox/Rectangle';
import { Shape } from 'Sandbox/Shape';

describe('Shape', () => {

    it('should construct', () => {
        const shape = new Shape([]);
        assert(shape);
    });

    it('should get correct area', () => {
        const shape = new Shape(Rectangle.Create(10, 10).vertices);
        assert.equal(shape.area(), 100);
    });

    it('should get correct centroid', () => {
        const shape = new Shape(Rectangle.Create(10, 10, new Vector(5, 5)).vertices);
        assert.deepEqual(shape.centroid(), new Vector(5, 5));
    });

    it('should get correct bounding box', () => {
        const shape = new Shape([
            new Vector(0, 0),
            new Vector(10, 10),
            new Vector(0, 10)
        ]);
        assert.deepEqual(shape.bounding_box(), new Rectangle(new Vector(0, 0), new Vector(10, 10)));
    });

    it('should intersect overlapping', () => {
        const shape1 = new Shape(Rectangle.Create(10, 10).vertices);
        const shape2 = new Shape(Rectangle.Create(10, 10, new Vector(5, 5)).vertices);
        assert(shape1.intersects(shape2));
    });

    it('should not intersect non-overlapping', () => {
        const shape1 = new Shape(Rectangle.Create(10, 10).vertices);
        const shape2 = new Shape(Rectangle.Create(10, 10, new Vector(15, 15)).vertices);
        assert(!shape1.intersects(shape2));
    });

    it('should get distance', () => {
        const shape1 = new Shape(Rectangle.Create(10, 10).vertices);
        const shape2 = new Shape(Rectangle.Create(10, 10).vertices).transform(new Vector(20, 0), 0);
        const distance = shape1.distance(shape2);
        assert.equal(distance.distance, 10);
    });

    it('should not get distance when overlapping', () => {
        const shape1 = new Shape(Rectangle.Create(10, 10).vertices);
        const shape2 = new Shape(Rectangle.Create(10, 10).vertices).transform(new Vector(7.5, 0), 0);
        const distance = shape1.distance(shape2);
        assert.equal(distance.intersects, false);
    });

    it('should get circle distance', () => {
        const shape1 = Shape.Circle(10, 10);
        const shape2 = Shape.Circle(10, 10).transform(new Vector(20, 20), 0);
        const distance = shape1.distance(shape2);
        assert.equal(distance.distance, 8.91491460744534);
    });

});
