import 'mocha';
import { assert } from 'chai';

import { Vector } from 'Sandbox/Vector';
import { Rectangle } from 'Sandbox/Rectangle';
import { Quadtree } from 'Sandbox/Quadtree';

describe('Quadtree', () => {

    it('should construct', () => {
        const quadtree = new Quadtree(Rectangle.Create(1, 1));
        assert(quadtree);
        assert.deepEqual(quadtree.rectangle, Rectangle.Create(1, 1));
    });

    it('should insert', () => {
        const quadtree = new Quadtree<number>(Rectangle.Create(10, 10));
        assert(quadtree.insert(1, Rectangle.Create(5, 5)));
        assert.equal(quadtree.count, 1);
    });

    it('should not insert non-overlapping', () => {
        const quadtree = new Quadtree<number>(Rectangle.Create(10, 10));
        assert(!quadtree.insert(1, Rectangle.Create(10, 10, new Vector(20, 20))));
        assert.equal(quadtree.count, 0);
    });

    it('should subdivide', () => {
        const quadtree = new Quadtree<number>(Rectangle.Create(20, 20, new Vector(10, 10)));
        assert(quadtree.insert(1, Rectangle.Create(5, 5, new Vector(5, 5))));
        assert(quadtree.insert(2, Rectangle.Create(5, 5, new Vector(15, 5))));
        assert(quadtree.insert(3, Rectangle.Create(5, 5, new Vector(5, 15))));
        assert(quadtree.insert(4, Rectangle.Create(5, 5, new Vector(15, 15))));
        assert.equal(quadtree.count, 4);
        assert(quadtree.insert(5, Rectangle.Create(5, 5, new Vector(10, 10))));
        assert.equal(quadtree.count, 8);
    });

    it('should find overlapping', () => {
        const quadtree = new Quadtree<number>(Rectangle.Create(10, 10));
        assert(quadtree.insert(1, Rectangle.Create(5, 5)));
        const objects = quadtree.find(Rectangle.Create(5, 5, new Vector(2.5, 2.5)));
        assert.deepEqual(objects, [1]);
    });

    it('should not find non-overlapping', () => {
        const quadtree = new Quadtree<number>(Rectangle.Create(10, 10));
        assert(quadtree.insert(1, Rectangle.Create(5, 5)));
        const objects = quadtree.find(Rectangle.Create(2.5, 2.5, new Vector(7.5, 7.5)));
        assert.deepEqual(objects, []);
    });

});
