export interface IPoint {
    x: number;
    y: number;
}

export class Point {

    public readonly x: number;
    public readonly y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    public getDTO(): IPoint {
        return {
            x: this.x,
            y: this.y
        };
    }

}
