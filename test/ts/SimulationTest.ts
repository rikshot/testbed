import 'mocha';
import { assert } from 'chai';

import { Simulation } from 'Sandbox/Simulation';
import { Vector } from 'Sandbox/Vector';
import { Shape } from 'Sandbox/Shape';
import { Color } from 'Sandbox/Color';
import { Material } from 'Sandbox/Material';
import { Rectangle } from 'Sandbox/Rectangle';
import { Entity } from 'Sandbox/Entity';

import DefaultSimulation from 'json/default.json';

describe('Simulation', () => {

    it('should construct', () => {
        const simulation = new Simulation(1, 1);
        assert(simulation);
    });

});
