import { ISchema } from 'Model';
import { IVehicle, Vehicle } from 'Models/Vehicle';

export interface ICar extends IVehicle {
    seats: number;
}

export class Car extends Vehicle<ICar> {

    public static readonly Schema: ISchema<ICar> = {
        ...Vehicle.Schema,
        seats: ['number']
    };

    public constructor(data: ICar) {
        super('Car', data, Car.Schema);
    }

    public getSeats() {
        return this.get('seats');
    }

    public getDTO() {
        return {
            ...super.getDTO(),
            seats: this.get('seats')
        };
    }

}
