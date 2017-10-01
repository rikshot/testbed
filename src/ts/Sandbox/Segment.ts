import { Vector } from 'Sandbox/Vector';

export class Segment {

    public static Closest(a: Segment, b: Segment): Segment {
        return new Segment(
            a.closest(b.a),
            a.closest(b.b)
        );
    }

    private readonly _a: Vector;
    private readonly _b: Vector;
    private readonly _segment: Vector;

    constructor(a: Vector, b: Vector) {
        this._a = a;
        this._b = b;
        this._segment = b.sub(a);
    }

    public get a(): Vector {
        return this._a;
    }

    public get b(): Vector {
        return this._b;
    }

    public get segment(): Vector {
        return this._segment;
    }

    public middle(): Vector {
        return new Vector(
            (this.a.x + this.b.x) / 2,
            (this.a.y + this.b.y) / 2
        );
    }

    public closest(vector: Vector | Segment): Vector {
        if (vector instanceof Vector) {
            const length_squared = this.segment.length_squared();
            if (length_squared <= Number.EPSILON) {
                return this.a;
            }
            let t = vector.sub(this.a).dot(this.segment) / length_squared;
            t = t > 1 ? 1 : t < 0 ? 0 : t;
            return this.segment.mul(t).add(this.a);
        } else {
            const segment = vector;
            if (this.distance(segment.a) < this.distance(segment.b)) {
                return this.a;
            }
            return this.b;
        }
    }

    public distance(vector: Vector): number {
        return vector.sub(this.a.add(this.segment.mul(vector.sub(this.a).dot(this.segment) / this.segment.length_squared()))).length();
    }

}
