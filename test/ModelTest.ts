import { assert } from 'chai';
import 'mocha';

import { Car } from 'Models/Car';

describe('Model', () => {

    let car: Car;

    beforeEach(() => {
        car = new Car({
            make: 'Volvo',
            model: 'V70',
            fuel: 0,
            seats: 4
        });
    });

    it('should construct', () => {
        assert.equal(car.getMake(), 'Volvo');
        assert.equal(car.getModel(), 'V70');
        assert.equal(car.getFuel(), 0);
        assert.equal(car.getSeats(), 4);
    });

    it('should construct from JSON', () => {
        const json = '{"make":"Volvo","model":"V70","fuel":0,"seats":4}';
        car = new Car(JSON.parse(json));
        assert.equal(car.getMake(), 'Volvo');
        assert.equal(car.getModel(), 'V70');
        assert.equal(car.getFuel(), 0);
        assert.equal(car.getSeats(), 4);
    });

    it('should not construct from invalid JSON', () => {
        const json = '{"make":"Volvo","model":"V70","fuel":"400","seats":4}';
        car = new Car(JSON.parse(json));
        assert.equal(car.getMake(), 'Volvo');
        assert.equal(car.getModel(), 'V70');
        assert.equal(car.getFuel(), 0);
        assert.equal(car.getSeats(), 4);
    });

    it('should pass valid set', () => {
        car.setMake('Subaru');
        assert.equal(car.getMake(), 'Subaru');
    });

    it('should not pass invalid set', () => {
        assert.throw(() => {
            car.setMake(4 as any);
        });
    });

});
