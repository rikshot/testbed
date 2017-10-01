import { Segment } from 'Sandbox/Segment';
import { Rectangle } from 'Sandbox/Rectangle';
import { Entity } from 'Sandbox/Entity';
import { Quadtree } from 'Sandbox/Quadtree';
import { Contact } from 'Sandbox/Contact';
import { Shape } from 'Sandbox/Shape';
import { Vector } from 'Sandbox/Vector';

export class Simulation {

    public readonly width: number;
    public readonly height: number;

    public readonly entities: Entity[] = [];
    public readonly quadtree: Quadtree<Entity>;

    private _world_shapes: Map<Entity, Shape> = new Map();
    private _bounding_boxes: Map<Entity, Rectangle> = new Map();

    private _collisions: Map<Entity, Set<Entity>> = new Map();
    private _islands: Array<Set<[Entity, Entity]>>;
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
            }
        }

        this.update_world_shapes();
        this.update_bounding_boxes();
        this.update_quadtree();

        this.find_collisions();
        this.find_islands();
        this.find_contacts();

        if (this._contacts.length > 0) {
            this.resolve_collisions();

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
                        if (!this._collisions.has(collider) || !this._collisions.get(collider)!.has(entity)) {
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
                  const arv = a.linear_velocity.add(ar.right().mul(a.angular_velocity));
                  const brv = b.linear_velocity.add(br.right().mul(b.angular_velocity));
                  B[i] += 2 * normal.right().mul(b.angular_velocity).dot(arv.sub(brv));
                }

                if (!a.kinematic) {
                    B[i] += normal.dot(a.linear_acceleration.add(ar.right().mul(a.angular_acceleration)).add(ar.right().mul(a.angular_velocity * a.angular_velocity)));
                }

                if (!b.kinematic) {
                    B[i] -= normal.dot(b.linear_acceleration.add(br.right().mul(b.angular_acceleration)).add(br.right().mul(b.angular_velocity * b.angular_velocity)));
                }
            }

            const f: number[] = new Array(n).fill(0);
            for (let iterations = 0; iterations < 100; ++iterations) {
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

                const threshold = 0.001;
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
