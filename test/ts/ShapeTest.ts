import * as tape from 'tape';

import { Rectangle } from 'Sandbox/Rectangle.js';
import { Shape } from 'Sandbox/Shape.js';
import { Vector } from 'Sandbox/Vector.js';

tape('Shape', (t) => {

    t.test('should construct', (st) => {
        const shape = new Shape([]);
        st.ok(shape);
        st.end();
    });

    t.test('should get correct area', (st) => {
        const shape = new Shape(Rectangle.Create(10, 10).vertices);
        st.equal(shape.area(), 100);
        st.end();
    });

    t.test('should get correct centroid', (st) => {
        const shape = new Shape(Rectangle.Create(10, 10, new Vector(5, 5)).vertices);
        st.deepEqual(shape.centroid(), new Vector(5, 5));
        st.end();
    });

    t.test('should get correct bounding box', (st) => {
        const shape = new Shape([
            new Vector(0, 0),
            new Vector(10, 10),
            new Vector(0, 10),
        ]);
        st.deepEqual(shape.bounding_box(), new Rectangle(new Vector(0, 0), new Vector(10, 10)));
        st.end();
    });

    t.test('should intersect overlapping', (st) => {
        const shape1 = new Shape(Rectangle.Create(10, 10).vertices);
        const shape2 = new Shape(Rectangle.Create(10, 10, new Vector(5, 5)).vertices);
        st.ok(shape1.intersects(shape2));
        st.end();
    });

    t.test('should not intersect non-overlapping', (st) => {
        const shape1 = new Shape(Rectangle.Create(10, 10).vertices);
        const shape2 = new Shape(Rectangle.Create(10, 10, new Vector(15, 15)).vertices);
        st.ok(!shape1.intersects(shape2));
        st.end();
    });

    t.test('should get distance', (st) => {
        const shape1 = new Shape(Rectangle.Create(10, 10).vertices);
        const shape2 = new Shape(Rectangle.Create(10, 10).vertices).transform(new Vector(20, 0), 0);
        const distance = shape1.distance(shape2);
        st.equal(distance.distance, 10);
        st.end();
    });

    t.test('should not get distance when overlapping', (st) => {
        const shape1 = new Shape(Rectangle.Create(10, 10).vertices);
        const shape2 = new Shape(Rectangle.Create(10, 10).vertices).transform(new Vector(7.5, 0), 0);
        const distance = shape1.distance(shape2);
        st.equal(distance.intersects, false);
        st.end();
    });

    t.test('should get circle distance', (st) => {
        const shape1 = Shape.Circle(10, 10);
        const shape2 = Shape.Circle(10, 10).transform(new Vector(20, 20), 0);
        const distance = shape1.distance(shape2);
        st.equal(distance.distance, 8.91491460744534);
        st.end();
    });

});
