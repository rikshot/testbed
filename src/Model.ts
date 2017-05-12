export type SchemaType = 'string' | 'number' | 'array' | 'object' | 'boolean' | 'undefined' | 'null';

export type ISchema<T extends object> = {
    [P in keyof T]: SchemaType[];
};

export abstract class Model<T extends object> {
    private _data: T;
    private readonly _schema: ISchema<T>;

    constructor(data: T, schema: ISchema<T>) {
        this._data = data;
        this._schema = schema;
    }

    public abstract getDTO(): { [key: string]: any };

    protected set<K extends keyof T>(key: K, value: T[K]): void {
         if (!(key in this._schema)) {
            throw new Error(key + ' (' + typeof key + ') is not in: ' + this._schema);
        }
         if (this.checkValue(value, this._schema[key])) {
            this._data[key] = value;
        } else {
            throw new Error(value + ' (' + typeof value + ') is not in: ' + this._schema[key]);
        }
    }

    protected get<K extends keyof T>(key: K): T[K] {
        return this._data[key];
    }

    private checkValue(value: {}, allowedTypes: SchemaType[]): boolean {
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
