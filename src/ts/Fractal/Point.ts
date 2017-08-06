export interface IPoint {
    x: number;
    y: number;
}

export class Point {

    private readonly _x: number;
    private readonly _y: number;

    constructor(x: number = 0, y: number = 0) {
        this._x = x;
        this._y = y;
    }

    public x() {
        return this._x;
    }

    public y() {
        return this._y;
    }

    public getDTO(): IPoint {
        return {
            x: this._x,
            y: this._y
        };
    }

}
