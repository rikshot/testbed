import { ISchema, Model } from 'Models/Model';

export interface IVehicle {
    make: string;
    model: string;
    fuel: number;
}

export abstract class Vehicle<T extends IVehicle> extends Model<T> {

    public static readonly Schema: ISchema<IVehicle> = {
        make: ['string'],
        model: ['string'],
        fuel: ['number'],
    };

    public getMake() {
        return this.get('make');
    }

    public setMake(make: string) {
        this.set('make', make);
    }

    public getModel() {
        return this.get('model');
    }

    public getFuel() {
        return this.get('fuel');
    }

}
