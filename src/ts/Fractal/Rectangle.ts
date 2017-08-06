import { Point, IPoint } from 'Fractal/Point';

export interface IRectangle {
    start: IPoint;
    end: IPoint;
    width: number;
    height: number;
}

export class Rectangle {

    private readonly _start: Point;
    private readonly _end: Point;

    private readonly _width: number;
    private readonly _height: number;

    constructor(start: Point, end: Point) {
        this._start = start;
        this._end = end;
        this._width = end.x() - start.x();
        this._height = end.y() - start.y();
    }

    public start() {
        return this._start;
    }

    public end() {
        return this._end;
    }

    public width() {
        return this._width;
    }

    public height() {
        return this._height;
    }

    public getDTO(): IRectangle {
        return {
            start: this._start.getDTO(),
            end: this._end.getDTO(),
            width: this._width,
            height: this._height
        };
    }

}
