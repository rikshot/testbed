import { Color } from 'Sandbox/Color';
import { Material } from 'Sandbox/Material';
import { Segment } from 'Sandbox/Segment';
import { Rectangle } from 'Sandbox/Rectangle';
import { Entity } from 'Sandbox/Entity';
import { Quadtree } from 'Sandbox/Quadtree';
import { Contact } from 'Sandbox/Contact';
import { Shape } from 'Sandbox/Shape';
import { Vector } from 'Sandbox/Vector';

type IColorJSON = [number, number, number, number];

interface IMaterialJSON {
    id: string;
    density: number;
    restitution: number;
    color: IColorJSON;
}

type IVectorJSON = [number, number];

interface IRectangleJSON {
    type: 'rectangle';
    width: number;
    height: number;
}

interface IPolygonJSON {
    type: 'polygon';
    vertices: IVectorJSON[];
}

type IShapeJSON = IRectangleJSON | IPolygonJSON;

interface IEntityJSON {
    id: string;
    shape: IShapeJSON;
    material: string;
    position: IVectorJSON;
    orientation?: number;
    kinematic?: boolean;
}

export interface ISimulationJSON {
    width: number;
    height: number;
    materials: IMaterialJSON[];
    entities: IEntityJSON[];
}

export class Simulation {

    public static Fetch(url: string): Promise<Simulation> {
        return fetch(url).then((response) => {
            return response.json();
        }).then((simulation: ISimulationJSON) => {
            return Simulation.Parse(simulation);
        });
    }

    public static Parse(json_simulation: ISimulationJSON): Simulation {
        const materials: { [key: string]: Material } = {};
        json_simulation['materials'].forEach((json_material) => {
            materials[json_material['id']] = new Material(
                json_material['density'],
                json_material['restitution'],
                new Color(
                    json_material['color'][0],
                    json_material['color'][1],
                    json_material['color'][2],
                    json_material['color'][3]
                )
            );
        });
        const simulation = new Simulation(json_simulation['width'], json_simulation['height']);
        json_simulation['entities'].forEach((json_entity) => {
            let json_shape = json_entity['shape'];
            const shape = (() => {
                switch (json_shape['type']) {
                    case 'rectangle':
                        json_shape = <IRectangleJSON>json_shape;
                        return new Shape(Rectangle.Create(json_shape['width'], json_shape['height']).vertices);

                    case 'polygon':
                        json_shape = <IPolygonJSON>json_shape;
                        return new Shape(json_shape['vertices'].map((vertex) => new Vector(vertex[0], vertex[1])));
                }
            })();
            const entity = new Entity(
                shape,
                materials[json_entity['material']]
            );
            if (json_entity['position']) {
                entity.position = new Vector(
                    json_entity['position'][0],
                    json_entity['position'][1]
                );
            }
            if (json_entity['orientation']) {
                entity.orientation = json_entity['orientation'];
            }
            if (json_entity['kinematic']) {
                entity.kinematic = true;
            }
            simulation.entities.push(entity);
        });
        return simulation;
    }

    public readonly width: number;
    public readonly height: number;

    public readonly entities: Entity[] = [];
    public readonly quadtree: Quadtree<Entity>;

    private _world_shapes: Map<Entity, Shape> = new Map();
    private _bounding_boxes: Map<Entity, Rectangle> = new Map();

    private _collisions: Map<Entity, Set<Entity>> = new Map();
    private _islands: Array<Set<[Entity, Entity]>> = [];
    private _contacts: Contact[][] = [];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.quadtree = new Quadtree<Entity>(Rectangle.Create(width, height, new Vector(width / 2, height / 2)));
    }

    public get contacts() {
        let contacts: Contact[] = [];
        for (const island of this._contacts) {
            contacts = contacts.concat(island);
        }
        return contacts;
    }

    public step(time_step: number) {
        for (const entity of this.entities) {
            if (!entity.kinematic && !entity.frozen) {
                entity.linear_acceleration = new Vector(0, -9.81);
                entity.angular_acceleration = 0;
            }
        }

        this.update_world_shapes();
        this.update_bounding_boxes();
        this.update_quadtree();

        this.find_collisions();
        this.find_islands();
        this.find_contacts();

        if (this._contacts.length > 0) {
            // this.resolve_collisions();

            for (let island of this._contacts) {
                island = island.filter((contact) => {
                    return contact.relative_velocity.length_squared() >= 0;
                });
            }

            this.resolve_contacts();
        }

        this.integrate(time_step);
    }

    private update_world_shapes() {
        this._world_shapes.clear();
        this.entities.forEach((entity) => {
            this._world_shapes.set(entity, entity.shape.transform(entity.position, entity.orientation));
        });
    }

    private update_bounding_boxes() {
        this._bounding_boxes.clear();
        this.entities.forEach((entity) => {
            this._bounding_boxes.set(entity, this._world_shapes.get(entity)!.bounding_box());
        });
    }

    private update_quadtree() {
        this.quadtree.clear();
        this.entities.forEach((entity) => {
            this.quadtree.insert(entity, this._bounding_boxes.get(entity)!);
        });
    }

    private find_collisions() {
        this._collisions.clear();
        this.entities.forEach((entity) => {
            if (!entity.kinematic) {
                const colliders = this.quadtree.find(this._bounding_boxes.get(entity)!);
                for (const collider of colliders) {
                    if (collider !== entity && (!entity.frozen || !collider.frozen)) {
                        if (!this._collisions.has(collider) ||  !this._collisions.get(collider)!.has(entity)) {
                            if (this._collisions.has(entity)) {
                                this._collisions.get(entity)!.add(collider);
                            } else {
                                this._collisions.set(entity, new Set([collider]));
                            }
                        }
                    }
                }
            }
        });
    }

    private find_islands() {
        const islands: Map<Entity, Set<[Entity, Entity]>> = new Map();
        this._collisions.forEach((colliders, entity) => {
            colliders.forEach((collider) => {
                let island: Set<[Entity, Entity]> = new Set();
                if (islands.has(entity)) {
                    island = islands.get(entity)!;
                } else if (islands.has(collider)) {
                    island = islands.get(collider)!;
                }

                if (!island.has([entity, collider]) && !island.has([collider, entity])) {
                    island.add([entity, collider]);
                    islands.set(entity, island);
                }
            });
        });
        this._islands = [];
        for (const island of islands.values()) {
            this._islands.push(island);
        }
    }

    private find_contacts() {
        this._contacts = new Array<Contact[]>(this._islands.length);
        this._contacts.fill([]);

        this._islands.forEach((island, index) => {
            island.forEach(([a, b]) => {
                const a_shape = this._world_shapes.get(a)!;
                const b_shape = this._world_shapes.get(b)!;
                if (a_shape.intersects(b_shape)) {
                    const a_core = a_shape.core();
                    const b_core = b_shape.core();
                    const distance = b_core.distance(a_core);
                    const a_feature = a_shape.feature(distance.normal.neg());
                    const b_feature = b_shape.feature(distance.normal);
                    const a_segment = new Segment(a_feature.closest(b_feature.a), a_feature.closest(b_feature.b));
                    const b_segment = new Segment(b_feature.closest(a_feature.a), b_feature.closest(a_feature.b));
                    if (a_segment.segment.parallel(b_segment.segment)) {
                        const contact_segment = Segment.Closest(a_segment, b_segment);
                        const contact1 = new Contact(a, b, contact_segment.a, contact_segment.a, distance.normal);
                        if (contact1.relative_velocity.length_squared() >= 0) {
                            this._contacts[index].push(contact1);
                        }
                        const contact2 = new Contact(a, b, contact_segment.b, contact_segment.b, distance.normal);
                        if (contact2.relative_velocity.length_squared() >= 0) {
                            this._contacts[index].push(contact2);
                        }
                    } else {
                        let ap = distance.a;
                        let bp = distance.b;
                        if (a_core.corner(distance.a)) {
                            bp = b_feature.closest(ap);
                        } else if (b_core.corner(bp)) {
                            ap = a_feature.closest(bp);
                        }

                        const contact = new Contact(a, b, ap, bp, distance.normal);
                        if (contact.relative_velocity.length_squared() >= 0) {
                            this._contacts[index].push(contact);
                        }
                    }
                }
            });
        });

        this._contacts = this._contacts.filter((island) => {
            return island.length > 0;
        });
    }

    private resolve_collisions() {
        for (const island of this._contacts) {
            for (const contact of island) {
                const a = contact.a;
                const b = contact.b;
                const normal = contact.normal;

                const ar = contact.ap.sub(a.position);
                const br = contact.bp.sub(b.position);

                const restitution = Math.max(a.material.restitution, b.material.restitution);

                if (a.kinematic) {
                    const brv = b.linear_velocity.add(br.right().mul(b.angular_velocity));

                    const impulse_numerator = brv.mul(restitution - 1).dot(normal);
                    const impulse_denominator = 1 / b.mass + (br.cross(normal) * br.cross(normal)) / b.moment;
                    const impulse = impulse_numerator / impulse_denominator;

                    b.linear_velocity = b.linear_velocity.add(normal.mul(impulse / b.mass));
                    b.angular_velocity += br.cross(normal.mul(impulse / b.moment));
                } else if (b.kinematic) {
                    const arv = a.linear_velocity.add(ar.right().mul(a.angular_velocity));

                    const impulse_numerator = arv.mul(restitution - 1).dot(normal);
                    const impulse_denominator = 1 / a.mass + (ar.cross(normal) * ar.cross(normal)) / a.moment;
                    const impulse = impulse_numerator / impulse_denominator;

                    a.linear_velocity = a.linear_velocity.add(normal.mul(impulse / a.mass));
                    a.angular_velocity += ar.cross(normal.mul(impulse / a.moment));
                } else {
                    const vab = a.linear_velocity.add(ar.right().mul(a.angular_velocity)).sub(b.linear_velocity.sub(br.right().mul(b.angular_velocity)));

                    const impulse_numerator = vab.mul(restitution - 1).dot(normal);
                    const impulse_denominator = 1 / a.mass + 1 / b.mass + (ar.cross(normal) * ar.cross(normal)) / a.moment + (br.cross(normal) * br.cross(normal)) / b.moment;
                    const impulse = impulse_numerator / impulse_denominator;

                    a.linear_velocity = a.linear_velocity.add(normal.mul(impulse / a.mass));
                    a.angular_velocity += ar.cross(normal.mul(impulse / a.moment));

                    b.linear_velocity = b.linear_velocity.sub(normal.mul(impulse / b.mass));
                    b.angular_velocity -= br.cross(normal.mul(impulse / b.moment));
                }
            }
        }
    }

    private resolve_contacts() {
        for (const island of this._contacts) {
            const n = island.length;
            const A: number[][] = new Array(n).fill(new Array(n).fill(0));

            for (let i = 0; i < n; ++i) {
                const contact_i = island[i];
                const i_a = contact_i.a;
                const i_b = contact_i.b;
                const i_normal = contact_i.normal;

                const i_ar = contact_i.ap.sub(i_a.position);
                const i_br = contact_i.bp.sub(i_b.position);

                for (let j = 0; j < n; ++j) {
                    const contact_j = island[j];
                    const j_a = contact_j.a;
                    const j_b = contact_j.b;
                    const j_normal = contact_j.normal;

                    const j_ar = contact_j.ap.sub(j_a.position);
                    const j_br = contact_j.bp.sub(j_b.position);

                    if (i_a === j_a) {
                        A[i][j] += i_normal.dot(j_normal.div(i_a.mass).add(Vector.TripleProductLeft(i_ar, j_ar, j_normal).div(i_a.moment)));
                    }
                    if (i_a === j_b) {
                        A[i][j] -= i_normal.dot(j_normal.div(i_a.mass).add(Vector.TripleProductLeft(i_ar, j_br, j_normal).div(i_a.moment)));
                    }
                    if (!i_b.kinematic && i_b === j_a) {
                        A[i][j] -= i_normal.dot(j_normal.div(i_b.mass).add(Vector.TripleProductLeft(i_br, j_ar, j_normal).div(i_b.moment)));
                    }
                    if (!i_b.kinematic && i_b === j_b) {
                        A[i][j] += i_normal.dot(j_normal.div(i_b.mass).add(Vector.TripleProductLeft(i_br, j_br, j_normal).div(i_b.moment)));
                    }
                }
            }

            const B: number[] = new Array(n).fill(0);
            for (let i = 0; i < n; ++i) {
                const contact = island[i];
                const a = contact.a;
                const b = contact.b;
                const normal = contact.normal;

                const ar = contact.ap.sub(a.position);
                const br = contact.bp.sub(b.position);

                if (!b.kinematic) {
                    const arv = a.linear_velocity.add(ar.mul(a.angular_velocity));
                    const brv = b.linear_velocity.add(br.mul(b.angular_velocity));
                    B[i] += 2 * normal.mul(b.angular_velocity).dot(arv.sub(brv));
                }

                if (!a.kinematic) {
                    B[i] += normal.dot(a.linear_acceleration.add(ar.mul(a.angular_acceleration)).add(ar.mul(a.angular_velocity * a.angular_velocity)));
                }

                if (!b.kinematic) {
                    B[i] -= normal.dot(b.linear_acceleration.add(br.mul(b.angular_acceleration)).add(br.mul(b.angular_velocity * b.angular_velocity)));
                }
            }

            const f = new Array(n).fill(0);
            for (let iterations = 0; iterations < 3; ++iterations) {
                for (let i = 0; i < n; ++i) {
                    let q = B[i];
                    for (let j = 0; j < n; ++j) {
                        if (j !== i) {
                            q += A[i][j] * f[j];
                        }
                    }
                    if (q >= 0) {
                        f[i] = 0;
                    } else {
                        f[i] -= q / A[i][i];
                    }
                }
            }

            for (let i = 0; i < n; ++i) {
                const contact = island[i];
                const a = contact.a;
                const b = contact.b;
                const normal = contact.normal;

                const force = f[i];
                if (!Number.isNaN(force) && Number.isFinite(force)) {
                    if (!a.kinematic) {
                        const ar = contact.ap.sub(a.position);
                        a.linear_acceleration = a.linear_acceleration.add(normal.mul(force / a.mass));
                        a.angular_acceleration += ar.cross(normal.mul(force / a.moment));
                    }
                    if (!b.kinematic) {
                        const br = contact.bp.sub(b.position);
                        b.linear_acceleration = b.linear_acceleration.sub(normal.mul(force / b.mass));
                        b.angular_acceleration -= br.cross(normal.mul(force / b.moment));
                    }
                }
            }
        }
    }

    private resolve_forces(n: number, A: number[][], B: number[]): number[] {
        const f = new Array(n).fill(0);
        const a = B.slice();
        const C = new Array(n).fill(false);
        const NC = new Array(n).fill(false);

        const maxStep = (delta_f: number[], delta_a: number[], d: number) => {
            let s = Number.POSITIVE_INFINITY;
            let j = -1;

            if (delta_a[d] > 0.0) {
                j = d;
                s = -a[d] / delta_a[d];
            }

            for (let i = 0; i < n; ++i) {
                if (C[i] && delta_f[i] < 0.0) {
                    const sPrime = -f[i] / delta_f[i];
                    if (sPrime < s) {
                        s = sPrime;
                        j = i;
                    }
                }
            }

            for (let i = 0; i < n; ++i) {
                if (NC[i] && delta_a[i] < 0.0) {
                    const sPrime = -a[i] / delta_a[i];
                    if (sPrime < s) {
                        s = sPrime;
                        j = i;
                    }
                }
            }

            if (s < 0.0) {
                throw new Error('stepSize is negative');
            }

            return [j, s];
        };

        const solve = (matrix: number[][]) => {
            const x = new Array(n).fill(0);

            const nrow = new Array(n);
            for (let i = 0; i < n; ++i) {
                nrow[i] = i;
            }

            for (let i = 0; i < n - 1; ++i) {
                let p = i;
                let max = Math.abs(matrix[nrow[p]][i]);
                for (let j = i + 1; j < n; ++j) {
                    if (Math.abs(matrix[nrow[j]][i]) > max) {
                        max = Math.abs(matrix[nrow[j]][i]);
                        p = j;
                    }
                }

                if (nrow[i] !== nrow[p]) {
                    const ncopy = nrow[i];
                    nrow[i] = nrow[p];
                    nrow[p] = ncopy;
                }

                for (let j = i + 1; j < n; ++j) {
                    const m = matrix[nrow[j]][i] / matrix[nrow[i]][i];
                    for (let k = 0; k < n + 1; ++k) {
                        matrix[nrow[j]][k] -= m * matrix[nrow[i]][k];
                    }
                }
            }

            x[n - 1] = matrix[nrow[n - 1]][n] / matrix[nrow[n - 1]][n - 1];
            for (let i = n - 2; i >= 0; --i) {
                let sum = 0;
                for (let j = i + 1; j < n; ++j) {
                    sum += matrix[nrow[i]][j] * x[j];
                }
                x[i] = (matrix[nrow[i]][n] - sum) / matrix[nrow[i]][i];
            }

            return x;
        };

        const fdirection = (delta_f: number[], d: number) => {
            delta_f[d] = 1.0;

            let c = 0;
            for (let i = 0; i < n; ++i) {
                if (C[i]) {
                    ++c;
                }
            }

            if (c) {
                const Acc = new Array(c).fill(new Array(c + 1).fill(0));

                let p = 0;
                for (let i = 0; i < n; ++i) {
                    if (C[i]) {
                        let q = 0;
                        for (let j = 0; j < n; ++j) {
                            if (C[j]) {
                                Acc[p][q] = A[i][j];
                                ++q;
                            }
                        }

                        Acc[p][c] = -A[i][d];
                        ++p;
                    }
                }

                const x = solve(Acc);

                p = 0;
                for (let i = 0; i < n; ++i) {
                    if (C[i]) {
                        delta_f[i] = x[p++];
                    }
                }
            }
        };

        const mul = (a: number[][], b: number[]) => {
            const temp = new Array(a.length).fill(new Array(b.length).fill(0));
            for (let row = 0; row < a.length; ++row) {
                for (let i = 0; i < a[0].length; ++i) {
                    temp[row][0] += a[row][i] * b[i];
                }
            }
            return temp;
        };

        for (let d = 0; d < n; ++d) {
            if (a[d] >= 0.0) {
                NC[d] = true;
            }

            while (a[d] < 0.0) {
                const delta_f = new Array(n).fill(0);
                fdirection(delta_f, d);

                const delta_a = mul(A, delta_f);

                for (let i = 0; i < n; ++i) {
                    if (C[i] && Math.abs(delta_a[i]) > 10e-10) {
                        throw new Error('fdirection failed!');
                    }
                }

                const [j, stepSize] = maxStep(delta_f, delta_a, d);

                for (let i = 0; i < n; ++i) {
                    f[i] += stepSize * delta_f[i];
                    a[i] += stepSize * delta_a[i];

                    if (f[i] < 0.0 && -10e-10 < f[i]) {
                        f[i] = 0.0;
                    }

                    if (a[i] < 0.0 && -10e-10 < a[i]) {
                        a[i] = 0.0;
                    }

                    if ((NC[i] || C[i]) && a[i] < 0.0) {
                        throw new Error('Acceleration cannot be negative');
                    }

                    if (f[i] < 0.0) {
                        throw new Error('Reaction force cannot be negative!');
                    }
                }

                if (C[j]) {
                    C[j] = false;
                    NC[j] = true;
                } else if (NC[j]) {
                    NC[j] = false;
                    C[j] = true;
                } else {
                    C[j] = true;
                    break;
                }
            }
        }

        return f;
    }

    private evaluate(initial: Entity, time_step: number, derivative: [Vector, Vector, number, number]): [Vector, Vector, number, number] {
        return [
            initial.linear_velocity.add(derivative[1].mul(time_step)),
            initial.linear_acceleration,
            initial.angular_velocity + derivative[3] * time_step,
            initial.angular_acceleration
        ];
    }

    private integrate(time_step: number) {
        for (const entity of this.entities) {
            if (!entity.kinematic) {
                const a = this.evaluate(entity, 0, [Vector.Zero, Vector.Zero, 0, 0]);
                const b = this.evaluate(entity, time_step * 0.5, a);
                const c = this.evaluate(entity, time_step * 0.5, b);
                const d = this.evaluate(entity, time_step, c);

                entity.position = entity.position.add((a[0].add(b[0].add(c[0]).mul(2)).add(d[0])).div(6).mul(time_step));
                entity.linear_velocity = entity.linear_velocity.add((a[1].add(b[1].add(c[1]).mul(2)).add(d[1])).div(6).mul(time_step));
                entity.orientation += (a[2] + (b[2] + c[2]) * 2 + d[2]) / 6 * time_step;
                entity.angular_velocity += (a[3] + (b[3] + c[3]) * 2 + d[3]) / 6 * time_step;

                const threshold = 0.01;
                if (entity.linear_velocity.length_squared() <= threshold && Math.abs(entity.angular_velocity) <= threshold) {
                    entity.frozen = true;
                    entity.linear_velocity = Vector.Zero;
                    entity.angular_velocity = 0;
                } else {
                    entity.frozen = false;
                }
            }
        }
    }

}
