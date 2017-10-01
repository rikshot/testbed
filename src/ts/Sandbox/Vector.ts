export interface IVector {
    x: number;
    y: number;
}

export class Vector implements IVector {

    public static Zero = new Vector();
    public static Resolution = 0.1;

    public static TripleProductLeft(a: Vector, b: Vector, c: Vector) {
        return b.mul(c.dot(a)).sub(a.mul(c.dot(b)));
    }

    public static TripleProductRight(a: Vector, b: Vector, c: Vector) {
        return b.mul(a.dot(c)).sub(c.mul(a.dot(b)));
    }

    public readonly x: number;
    public readonly y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    public equal(vector: Vector) {
        return Math.abs(this.x - vector.x) <= Vector.Resolution && Math.abs(this.y - vector.y) <= Vector.Resolution;
    }

    public neg(): Vector {
        return new Vector(
            -this.x,
            -this.y
        );
    }

    public add(vector: Vector): Vector {
        return new Vector(
            this.x + vector.x,
            this.y + vector.y
        );
    }

    public sub(vector: Vector): Vector {
        return new Vector(
            this.x - vector.x,
            this.y - vector.y
        );
    }

    public mul(value: number): Vector {
        return new Vector(
            this.x * value,
            this.y * value
        );
    }

    public div(value: number): Vector {
        return new Vector(
            this.x / value,
            this.y / value
        );
    }

    public dot(vector: Vector): number {
        return this.x * vector.x + this.y * vector.y;
    }

    public cross(vector: Vector): number {
        return this.x * vector.y - this.y * vector.x;
    }

    public length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    public length_squared(): number {
        return this.x * this.x + this.y * this.y;
    }

    public normal(): Vector {
        const length = this.length();
        if (length <= Number.EPSILON) {
            return new Vector();
        }
        return new Vector(
            this.x / length,
            this.y / length
        );
    }

    public left(): Vector {
        return new Vector(
            this.y,
            -this.x
        );
    }

    public right(): Vector {
        return new Vector(
            -this.y,
            this.x
        );
    }

    public parallel(vector: Vector): boolean {
        return Math.abs(this.cross(vector)) <= Vector.Resolution;
    }

    public getDTO(): IVector {
        return {
            x: this.x,
            y: this.y
        };
    }

}
