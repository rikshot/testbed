import 'mocha';
import { assert } from 'chai';

import { Simulation } from 'Sandbox/Simulation';
import { Vector } from 'Sandbox/Vector';
import { Shape } from 'Sandbox/Shape';
import { Color } from 'Sandbox/Color';
import { Material } from 'Sandbox/Material';
import { Rectangle } from 'Sandbox/Rectangle';
import { Entity } from 'Sandbox/Entity';

describe('Simulation', () => {

    it('should construct', () => {
        const simulation = new Simulation(1, 1);
        assert(simulation);
    });

    it('should handle kinetic to kinematic pair', () => {
        const simulation = new Simulation(100, 100);
        const material = new Material(1, 1, Color.White);
        const box = new Entity(Shape.Rectangle(10, 10), material);
        box.position = new Vector(45, 40);
        const floor = new Entity(Shape.Rectangle(100, 10), material);
        floor.position = new Vector(50, 50);
        floor.kinematic = true;
        simulation.entities.push(box, floor);
        simulation.step(0.016);
        simulation.step(0.016);
        assert.deepEqual(box.position, new Vector(45, 40));
    });

});
