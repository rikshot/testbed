import { ISchema } from 'Models/Model';
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

}
