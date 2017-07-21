/* tslint:disable:no-bitwise */

export class Candidates {

    private _value = 512;

    public get(candidate?: number): number | boolean {
        return typeof candidate === 'undefined' ? this._value : !!((1 << candidate) & this._value);
    }

    public set(candidate?: number): void {
        this._value = typeof candidate === 'undefined' ? 512 : (1 << candidate) ^ this._value;
    }

    public unset(candidate?: number): void {
        this._value = typeof candidate === 'undefined' ? 0 : ~(1 << candidate) & this._value;
    }

    public some(): boolean {
        return this._value > 0;
    }

    public none(): boolean {
        return this._value === 0;
    }

}
