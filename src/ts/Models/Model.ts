export type SchemaType = 'string' | 'number' | 'array' | 'object' | 'boolean' | 'undefined' | 'null';

export type ISchema<T extends object> = {
    [P in keyof T]: SchemaType[];
};

export class Model<T extends object> {
    public readonly name: string;

    private _data: T;
    private readonly _schema: ISchema<T>;

    constructor(data: T, schema: ISchema<T>) {
        this.name = this.constructor.name;
        this._data = {} as T;
        this._schema = schema;
        this.setAll(data);
    }

    public set<K extends keyof T>(key: K, value: T[K]): void {
        if (!(key in this._schema)) {
            throw new Error(this.name + ' - ' + key + ' (' + typeof key + ') is not in: ' + this._schema);
        }
        if (this.checkValue(value, this._schema[key])) {
            this._data[key] = value;
        } else {
            throw new Error(this.name + ' - ' + value + ' (' + typeof value + ') is not in: ' + this._schema[key]);
        }
    }

    public setAll(data: T) {
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                this.set(key, data[key]);
            }
        }
    }

    public get<K extends keyof T>(key: K): T[K] {
        return this._data[key];
    }

    private checkValue<K>(value: K, allowedTypes: SchemaType[]): boolean {
        for (const currentType of allowedTypes) {
            if (typeof value === currentType) {
                return true;
            } else if (currentType === 'array' && Array.isArray(value)) {
                return true;
            } else if (currentType === 'null' && value === null) {
                return true;
            }
        }
        return false;
    }
}
