import { Rectangle } from 'Sandbox/Rectangle.js';
import { Vector } from 'Sandbox/Vector.js';
import { Segment } from 'Sandbox/Segment.js';

export interface IDistance {
    intersects: boolean;
    normal: Vector;
    distance: number;
    a: Vector;
    b: Vector;
}

export class Shape {

    public static Rectangle(width: number, height: number) {
        return new Shape(Rectangle.Create(width, height).vertices);
    }

    public static Circle(radius: number, sections: number): Shape {
        const vertices = new Array(sections);
        const arc = 2 * Math.PI / sections;
        for (let i = 0; i < sections; ++i) {
            const angle = arc * i;
            vertices[i] = new Vector(Math.cos(angle), Math.sin(angle)).mul(radius);
        }
        return new Shape(vertices);
    }

    private readonly _vertices: Vector[];

    constructor(vertices: Vector[]) {
        this._vertices = vertices;
    }

    public get vertices(): Vector[] {
        return this._vertices;
    }

    public core(): Shape {
        const centroid = this.centroid();
        return new Shape(this._vertices.map((vertex) => {
            return vertex.add(centroid.sub(vertex).normal().mul(5));
        }));
    }

    public area(): number {
        let area = 0;
        for (let i = this._vertices.length - 1, j = 0; j < this._vertices.length; i = j, ++j) {
            const vertex1 = this._vertices[i];
            const vertex2 = this._vertices[j];
            area += vertex1.x * vertex2.y - vertex2.x * vertex1.y;
        }
        return area / 2;
    }

    public centroid(): Vector {
        let x = 0;
        let y = 0;
        for (let i = this._vertices.length - 1, j = 0; j < this._vertices.length; i = j, ++j) {
            const vertex1 = this._vertices[i];
            const vertex2 = this._vertices[j];
            const cross = vertex1.cross(vertex2);
            x += (vertex1.x + vertex2.x) * cross;
            y += (vertex1.y + vertex2.y) * cross;
        }
        const area = 6 * this.area();
        return new Vector(x / area, y / area);
    }

    public bounding_box(): Rectangle {
        let x_min = this._vertices[0].x;
        let x_max = this._vertices[0].x;
        let y_min = this._vertices[0].y;
        let y_max = this._vertices[0].y;
        for (const vertex of this._vertices) {
            const x = vertex.x;
            const y = vertex.y;
            if (x < x_min) {
                x_min = x;
            } else if (x > x_max) {
                x_max = x;
            }
            if (y < y_min) {
                y_min = y;
            } else if (y > y_max) {
                y_max = y;
            }
        }
        return new Rectangle(
            new Vector(x_min, y_min),
            new Vector(x_max, y_max)
        );
    }

    public corner(vector: Vector): boolean {
        for (const vertex of this._vertices) {
            if (vector.equal(vertex)) {
                return true;
            }
        }
        return false;
    }

    public support(direction: Vector): number {
        let support = 0;
        let max_dot = direction.dot(this._vertices[support]);
        for (let i = 1; i < this._vertices.length; ++i) {
            const dot = direction.dot(this._vertices[i]);
            if (dot > max_dot) {
                support = i;
                max_dot = dot;
            }
        }
        return support;
    }

    public feature(direction: Vector): Segment {
        const support = this.support(direction);
        const left = new Segment(
            this._vertices[support === 0 ? this._vertices.length - 1 : support - 1],
            this._vertices[support]
        );
        const right = new Segment(
            this._vertices[support + 1 === this._vertices.length ? 0 : support + 1],
            this._vertices[support]
        );
        if (left.segment.dot(direction) < right.segment.dot(direction)) {
            return left;
        }
        return right;
    }

    public intersects(shape: Shape): boolean {
        let direction = shape.centroid().sub(this.centroid());

        const simplex: Vector[] = [];
        simplex.push(this.vertices[this.support(direction)].sub(shape.vertices[shape.support(direction.neg())]));
        direction = direction.neg();

        const max_iterations = this.vertices.length * shape.vertices.length;
        for (let i = 0; i < max_iterations; ++i) {
            const a = this.vertices[this.support(direction)].sub(shape.vertices[shape.support(direction.neg())]);
            if (a.dot(direction) <= 0) {
                return false;
            }
            simplex.push(a);
            const ao = a.neg();
            if (simplex.length === 3) {
                const b = simplex[1];
                const c = simplex[0];
                const ab = b.sub(a);
                const ac = c.sub(a);
                const ab_triple = Vector.TripleProductLeft(ac, ab, ab);
                if (ab_triple.dot(ao) >= 0) {
                    simplex.shift();
                    direction = ab_triple;
                } else {
                    const ac_triple = Vector.TripleProductLeft(ab, ac, ac);
                    if (ac_triple.dot(ao) >= 0) {
                        simplex.splice(1);
                        direction = ac_triple;
                    } else {
                        return true;
                    }
                }
            } else {
                const b = simplex[0];
                const ab = b.sub(a);
                direction = Vector.TripleProductLeft(ab, ao, ab);
                if (direction.equal(new Vector())) {
                    direction = ab.left();
                }
            }
        }
        return false;
    }

    public distance(shape: Shape): IDistance {
        let direction = shape.centroid().sub(this.centroid());

        let a = new Segment(shape.vertices[shape.support(direction.neg())], this.vertices[this.support(direction)]);
        let b = new Segment(shape.vertices[shape.support(direction)], this.vertices[this.support(direction.neg())]);
        let c: Segment;

        direction = new Segment(b.segment, a.segment).closest(new Vector());

        const max_iterations = this.vertices.length * shape.vertices.length;
        for (let i = 0; i < max_iterations; ++i) {
            direction = direction.neg().normal();

            if (direction.equal(new Vector())) {
                return { intersects: false, normal: new Vector(), distance: 0, a: new Vector(), b: new Vector() };
            }

            c = new Segment(shape.vertices[shape.support(direction.neg())], this.vertices[this.support(direction)]);

            if (a.segment.cross(b.segment) * b.segment.cross(c.segment) > 0 && a.segment.cross(b.segment) * c.segment.cross(a.segment) > 0) {
                return { intersects: false, normal: new Vector(), distance: 0, a: new Vector(), b: new Vector() };
            }

            const projection = c.segment.dot(direction);
            if (projection - a.segment.dot(direction) < Math.sqrt(Number.EPSILON)) {
                const closest_points = Segment.Closest(a, b);
                return { intersects: true, normal: direction, distance: -projection, a: closest_points.a, b: closest_points.b };
            }

            const point1 = new Segment(a.segment, c.segment).closest(new Vector());
            const point2 = new Segment(c.segment, b.segment).closest(new Vector());

            const point1_length = point1.length();
            const point2_length = point2.length();

            if (point1_length <= Number.EPSILON) {
                const closest_points = Segment.Closest(a, c);
                return { intersects: true, normal: direction, distance: point1_length, a: closest_points.a, b: closest_points.b };
            } else if (point2_length <= Number.EPSILON) {
                const closest_points = Segment.Closest(c, b);
                return { intersects: true, normal: direction, distance: point2_length, a: closest_points.a, b: closest_points.b };
            }

            if (point1_length < point2_length) {
                b = c;
                direction = point1;
            } else {
                a = c;
                direction = point2;
            }
        }

        const closest_points = Segment.Closest(a, b);
        return { intersects: true, normal: direction, distance: c!.segment.neg().dot(direction), a: closest_points.a, b: closest_points.b };
    }

    public transform(position: Vector, orientation: number): Shape {
        const sin = Math.sin(orientation);
        const cos = Math.cos(orientation);
        return new Shape(this._vertices.map((vertex) => {
            return new Vector(cos * vertex.x - sin * vertex.y, sin * vertex.x + cos * vertex.y).add(position);
        }));
    }

}
