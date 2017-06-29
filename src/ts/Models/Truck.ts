import { ISchema } from 'Model';
import { IVehicle, Vehicle } from 'Models/Vehicle';

export interface ITruck extends IVehicle {
    capacity: number;
    wheels: number;
}

export class Truck extends Vehicle<ITruck> {

    public static readonly Schema: ISchema<ITruck> = {
        ...Vehicle.Schema,
        capacity: ['number'],
        wheels: ['number']
    };

    constructor(data: ITruck) {
        super('Truck', data, Truck.Schema);
    }

    public getCapacity() {
        return this.get('capacity');
    }

    public getWheels() {
        return this.get('wheels');
    }

    public getDTO() {
        return {
            ...super.getDTO(),
            capacity: this.get('capacity'),
            wheels: this.get('wheels')
        };
    }

}
