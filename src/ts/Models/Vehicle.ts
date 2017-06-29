import { ISchema, Model } from 'Model';

export interface IVehicle {
    make: string;
    model: string;
    fuel: number;
}

export abstract class Vehicle<T extends IVehicle> extends Model<T> {

    public static readonly Schema: ISchema<IVehicle> = {
        make: ['string'],
        model: ['string'],
        fuel: ['number']
    };

    constructor(name: string, data: T, schema: ISchema<T>) {
        super(name, data, schema);
    }

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

    public getDTO() {
        return {
            make: this.get('make'),
            model: this.get('model'),
            fuel: this.get('fuel')
        };
    }

}
