import { Vector } from 'Sandbox/Vector';
import { Entity } from 'Sandbox/Entity';

export class Contact {

    public readonly a: Entity;
    public readonly b: Entity;

    public readonly ap: Vector;
    public readonly bp: Vector;

    public readonly normal: Vector;

    constructor(a: Entity, b: Entity, ap: Vector, bp: Vector, normal: Vector) {
        this.a = a;
        this.b = b;
        this.ap = ap;
        this.bp = bp;
        this.normal = normal;
    }

    public get relative_velocity(): Vector {
        const ra = this.a.position.sub(this.ap);
        const rb = this.b.position.sub(this.bp);
        const vab = this.b.linear_velocity.sub(rb.right().mul(this.b.angular_velocity)).sub(this.a.linear_velocity).add(ra.right().mul(this.a.angular_velocity));
        return vab;
    }

}
