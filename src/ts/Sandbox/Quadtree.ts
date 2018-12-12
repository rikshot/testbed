import { Vector } from 'Sandbox/Vector.js';
import { Rectangle } from 'Sandbox/Rectangle.js';

export class Quadtree<T> {

    private readonly _rectangle: Rectangle;

    private _count = 0;
    private _size = 4;

    private _objects: T[];
    private _rectangles: Rectangle[];

    private _quadrants?: Array<Quadtree<T>>;

    constructor(rectangle: Rectangle, size?: number) {
        this._rectangle = rectangle;
        if (typeof size !== 'undefined') {
            this._size = size;
        }
        this._objects = new Array(this._size);
        this._rectangles = new Array(this._size);
    }

    public get rectangle(): Rectangle {
        return this._rectangle;
    }

    public get size(): number {
        return this._size;
    }

    public get count(): number {
        let count = this._count;
        if (this._quadrants) {
            for (const quadrant of this._quadrants) {
                count += quadrant.count;
            }
        }
        return count;
    }

    public get objects(): T[] {
        return this._objects || [];
    }

    public get rectangles(): Rectangle[] {
        return this._rectangles || [];
    }

    public insert(object: T, rectangle: Rectangle) {
        if (rectangle.overlaps(this._rectangle)) {
            if (this._count === this._size || this._quadrants) {
                this.subdivide();
                for (const quadrant of this._quadrants!) {
                    quadrant.insert(object, rectangle);
                }
            } else {
                this._objects[this._count] = object;
                this._rectangles[this._count] = rectangle;
                ++this._count;
            }
            return true;
        }
        return false;
    }

    public find(rectangle: Rectangle): T[] {
        const objects: T[] = [];
        this.find_impl(rectangle, objects);
        return objects;
    }

    public visit(callback: (quadtree: Quadtree<T>, depth: number) => void): void {
        this.visit_impl(callback, 0);
    }

    public clear(): void {
        this._objects = new Array(this._size);
        this._rectangles = new Array(this._size);
        this._count = 0;
        if (this._quadrants) {
            delete this._quadrants;
        }
    }

    private find_impl(rectangle: Rectangle, objects: T[]): void {
        if (rectangle.overlaps(this._rectangle)) {
            for (let i = 0; i < this._count; ++i) {
                if (rectangle.overlaps(this._rectangles[i])) {
                    objects.push(this._objects[i]);
                }
            }
            if (this._quadrants) {
                for (const quadrant of this._quadrants) {
                    quadrant.find_impl(rectangle, objects);
                }
            }
        }
    }

    private visit_impl(callback: (quadtree: Quadtree<T>, depth: number) => void, depth: number) {
        if (this._quadrants) {
            for (const quadrant of this._quadrants) {
                quadrant.visit_impl(callback, depth + 1);
            }
        } else {
            callback(this, depth);
        }
    }

    private subdivide(): void {
        if (typeof this._quadrants === 'undefined') {
            const half_width = this._rectangle.width / 2;
            const half_height = this._rectangle.height / 2;
            this._quadrants = [
              new Quadtree(new Rectangle(
                this._rectangle.start,
                new Vector(this._rectangle.start.x + half_width, this._rectangle.start.y + half_height)
              )),
              new Quadtree(new Rectangle(
                new Vector(this._rectangle.start.x + half_width, this._rectangle.start.y),
                new Vector(this._rectangle.end.x, this._rectangle.start.y + half_height)
              )),
              new Quadtree(new Rectangle(
                new Vector(this._rectangle.start.x + half_width, this._rectangle.start.y + half_height),
                this._rectangle.end
              )),
              new Quadtree(new Rectangle(
                new Vector(this._rectangle.start.x, this._rectangle.start.y + half_height),
                new Vector(this._rectangle.start.x + half_width, this._rectangle.end.y)
              ))
            ];
            for (let i = 0; i < this._count; ++i) {
                for (const quadrant of this._quadrants) {
                    quadrant.insert(this._objects[i], this._rectangles[i]);
                }
            }
            delete this._objects;
            delete this._rectangles;
            this._count = 0;
        }
    }

}
