import * as tape from 'tape';

import { Quadtree } from 'Sandbox/Quadtree.js';
import { Rectangle } from 'Sandbox/Rectangle.js';
import { Vector } from 'Sandbox/Vector.js';

tape('Quadtree', (t) => {

    t.test('should construct', (st) => {
        const quadtree = new Quadtree(Rectangle.Create(1, 1));
        st.ok(quadtree);
        st.deepEqual(quadtree.rectangle, Rectangle.Create(1, 1));
        st.end();
    });

    t.test('should insert', (st) => {
        const quadtree = new Quadtree<number>(Rectangle.Create(10, 10));
        st.ok(quadtree.insert(1, Rectangle.Create(5, 5)));
        st.equal(quadtree.count, 1);
        st.end();
    });

    t.test('should not insert non-overlapping', (st) => {
        const quadtree = new Quadtree<number>(Rectangle.Create(10, 10));
        st.ok(!quadtree.insert(1, Rectangle.Create(10, 10, new Vector(20, 20))));
        st.equal(quadtree.count, 0);
        st.end();
    });

    t.test('should subdivide', (st) => {
        const quadtree = new Quadtree<number>(Rectangle.Create(20, 20, new Vector(10, 10)));
        st.ok(quadtree.insert(1, Rectangle.Create(5, 5, new Vector(5, 5))));
        st.ok(quadtree.insert(2, Rectangle.Create(5, 5, new Vector(15, 5))));
        st.ok(quadtree.insert(3, Rectangle.Create(5, 5, new Vector(5, 15))));
        st.ok(quadtree.insert(4, Rectangle.Create(5, 5, new Vector(15, 15))));
        st.equal(quadtree.count, 4);
        st.ok(quadtree.insert(5, Rectangle.Create(5, 5, new Vector(10, 10))));
        st.equal(quadtree.count, 8);
        st.end();
    });

    t.test('should find overlapping', (st) => {
        const quadtree = new Quadtree<number>(Rectangle.Create(10, 10));
        st.ok(quadtree.insert(1, Rectangle.Create(5, 5)));
        const objects = quadtree.find(Rectangle.Create(5, 5, new Vector(2.5, 2.5)));
        st.deepEqual(objects, [1]);
        st.end();
    });

    t.test('should not find non-overlapping', (st) => {
        const quadtree = new Quadtree<number>(Rectangle.Create(10, 10));
        st.ok(quadtree.insert(1, Rectangle.Create(5, 5)));
        const objects = quadtree.find(Rectangle.Create(2.5, 2.5, new Vector(7.5, 7.5)));
        st.deepEqual(objects, []);
        st.end();
    });

});
