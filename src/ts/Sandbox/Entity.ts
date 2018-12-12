import { Material } from 'Sandbox/Material.js';
import { Shape } from 'Sandbox/Shape.js';
import { Vector } from 'Sandbox/Vector.js';

export class Entity {

    public readonly shape: Shape;
    public readonly material: Material;

    public readonly mass: number;
    public readonly moment: number;

    public position: Vector = Vector.Zero;
    public linear_velocity: Vector = Vector.Zero;
    public linear_acceleration: Vector = Vector.Zero;

    public orientation: number = 0;
    public angular_velocity: number = 0;
    public angular_acceleration: number = 0;

    public kinematic: boolean = false;
    public frozen: boolean = false;

    constructor(shape: Shape, material: Material) {
        this.shape = shape;
        this.material = material;

        this.mass = material.density * shape.area();

        let numerator = 0;
        let denominator = 0;
        const vertices = shape.vertices;
        for (let i = vertices.length - 1, j = 0; j < vertices.length; i = j, ++j) {
            const vertex1 = vertices[i];
            const vertex2 = vertices[j];
            const cross = vertex2.cross(vertex1);
            numerator += cross * (vertex2.dot(vertex2) + vertex2.dot(vertex1) + vertex1.dot(vertex1));
            denominator += cross;
        }
        this.moment = this.mass / 6 * (numerator / denominator);
    }

}
