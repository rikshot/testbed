import { Vector, IVector } from 'Sandbox/Vector.js';

export interface IRectangle {
    start: IVector;
    end: IVector;
    width: number;
    height: number;
}

export class Rectangle {

    public static Create(width: number, height: number, position?: Vector) {
        position = position ? position : Vector.Zero;
        const half_width = width / 2;
        const half_height = height / 2;
        return new Rectangle(
            new Vector(position.x - half_width, position.y - half_height),
            new Vector(position.x + half_width, position.y + half_height)
        );
    }

    public readonly start: Vector;
    public readonly end: Vector;

    public readonly width: number;
    public readonly height: number;

    private _vertices?: Vector[];

    constructor(start: Vector = new Vector(), end: Vector = new Vector()) {
        this.start = start;
        this.end = end;
        this.width = Math.abs(end.x - start.x);
        this.height = Math.abs(end.y - start.y);
    }

    public overlaps(rectangle: Rectangle) {
        return this.start.x <= rectangle.end.x &&
            rectangle.start.x <= this.end.x &&
            this.start.y <= rectangle.end.y &&
            rectangle.start.y <= this.end.y;
    }

    public get vertices(): Vector[] {
        return this._vertices ? this._vertices : this._vertices = [
            this.start,
            new Vector(this.end.x, this.start.y),
            this.end,
            new Vector(this.start.x, this.end.y)
        ];
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
