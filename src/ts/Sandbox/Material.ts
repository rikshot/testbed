import { Color } from 'Sandbox/Color.js';

export class Material {

    private readonly _density: number;
    private readonly _restitution: number;
    private readonly _color: Color;

    constructor(density: number, restitution: number, color: Color) {
        this._density = density;
        this._restitution = restitution;
        this._color = color;
    }

    public get density(): number {
        return this._density;
    }

    public get restitution(): number {
        return this._restitution;
    }

    public get color(): Color {
        return this._color;
    }

}
