import * as tape from 'tape';

import { Car } from 'Models/Car.js';

tape('Model', (t) => {

    t.test('should construct', (st) => {
        const car = new Car({
            make: 'Volvo',
            model: 'V70',
            fuel: 0,
            seats: 4
        });
        st.equal(car.name, 'Car');
        st.equal(car.getMake(), 'Volvo');
        st.equal(car.getModel(), 'V70');
        st.equal(car.getFuel(), 0);
        st.equal(car.getSeats(), 4);
        st.end();
    });

    t.test('should construct from JSON', (st) => {
        const json = '{"make":"Volvo","model":"V70","fuel":0,"seats":4}';
        const car = new Car(JSON.parse(json));
        st.equal(car.getMake(), 'Volvo');
        st.equal(car.getModel(), 'V70');
        st.equal(car.getFuel(), 0);
        st.equal(car.getSeats(), 4);
        st.end();
    });

    t.test('should not construct from invalid JSON', (st) => {
        const json = '{"make":"Volvo","model":"V70","fuel":"400","seats":4}';
        st.throws(() => {
            const car = new Car(JSON.parse(json));
        });
        st.end();
    });

    t.test('should pass valid set', (st) => {
        const car = new Car({seats: 4, make: 'Toyota', model: 'Celica', fuel: 0});
        car.setMake('Subaru');
        st.equal(car.getMake(), 'Subaru');
        st.end();
    });

    t.test('should not pass invalid set', (st) => {
        const car = new Car({seats: 4, make: 'Toyota', model: 'Celica', fuel: 0});
        st.throws(() => {
            car.setMake(4 as any);
        });
        st.end();
    });

});
