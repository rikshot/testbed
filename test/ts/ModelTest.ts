import { assert } from 'chai';
import 'mocha';

import { Car } from 'Models/Car';

describe('Model', () => {

    it('should construct', () => {
        const car = new Car({
            make: 'Volvo',
            model: 'V70',
            fuel: 0,
            seats: 4
        });
        assert.equal(car.getMake(), 'Volvo');
        assert.equal(car.getModel(), 'V70');
        assert.equal(car.getFuel(), 0);
        assert.equal(car.getSeats(), 4);
    });

    it('should construct from JSON', () => {
        const json = '{"make":"Volvo","model":"V70","fuel":0,"seats":4}';
        const car = new Car(JSON.parse(json));
        assert.equal(car.getMake(), 'Volvo');
        assert.equal(car.getModel(), 'V70');
        assert.equal(car.getFuel(), 0);
        assert.equal(car.getSeats(), 4);
    });

    it('should not construct from invalid JSON', () => {
        const json = '{"make":"Volvo","model":"V70","fuel":"400","seats":4}';
        assert.throws(() => {
            const car = new Car(JSON.parse(json));
        });
    });

    it('should pass valid set', () => {
        const car = new Car({seats: 4, make: 'Toyota', model: 'Celica', fuel: 0});
        car.setMake('Subaru');
        assert.equal(car.getMake(), 'Subaru');
    });

    it('should not pass invalid set', () => {
        const car = new Car({seats: 4, make: 'Toyota', model: 'Celica', fuel: 0});
        assert.throws(() => {
            car.setMake(4 as any);
        });
    });

});
