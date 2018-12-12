import { Rectangle, IRectangle } from 'Sandbox/Rectangle.js';

export interface IConfig {
    iterations: number;
    red: number;
    green: number;
    blue: number;
    rectangle: IRectangle;
}

export class Config {

    public readonly iterations: number;
    public readonly red: number;
    public readonly green: number;
    public readonly blue: number;
    public readonly rectangle: Rectangle;

    constructor(iterations: number, red: number, green: number, blue: number, rectangle: Rectangle) {
        this.iterations = iterations;
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.rectangle = rectangle;
    }

    public getDTO(): IConfig {
        return {
            iterations: this.iterations,
            red: this.red,
            green: this.green,
            blue: this.blue,
            rectangle: this.rectangle.getDTO()
        };
    }

}
