export class NumberRange {

    public static Scale(input: NumberRange, value: number, output: NumberRange): number {
        return (input.max() * output.min() - input.min() * output.max() + value * output.size()) / input.size();
    }

    private readonly _min: number;
    private readonly _max: number;
    private readonly _size: number;

    constructor(min: number, max: number) {
        this._min = min;
        this._max = max;
        this._size = Math.abs(max - min);
    }

    public min() {
        return this._min;
    }

    public max() {
        return this._max;
    }

    public size() {
        return this._size;
    }

}
