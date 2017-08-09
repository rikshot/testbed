import { Point, IPoint } from 'Fractal/Point';

export interface IRectangle {
    start: IPoint;
    end: IPoint;
    width: number;
    height: number;
}

export class Rectangle {

    public readonly start: Point;
    public readonly end: Point;

    public readonly width: number;
    public readonly height: number;

    constructor(start: Point = new Point(), end: Point = new Point()) {
        this.start = start;
        this.end = end;
        this.width = Math.abs(end.x - start.x);
        this.height = Math.abs(end.y - start.y);
    }

    public getDTO(): IRectangle {
        return {
            start: this.start.getDTO(),
            end: this.end.getDTO(),
            width: this.width,
            height: this.height
        };
    }

}
