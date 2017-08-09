import { Rectangle, IRectangle } from 'Fractal/Rectangle';

export interface IChunkConfig {
    width: number;
    height: number;
    image: IRectangle;
    complex: IRectangle;
    buffer?: SharedArrayBuffer;
}

export class ChunkConfig {

    public readonly width: number;
    public readonly height: number;
    public readonly image: Rectangle;
    public readonly complex: Rectangle;
    public readonly buffer?: SharedArrayBuffer;

    constructor(width: number, height: number, image: Rectangle, complex: Rectangle, buffer?: SharedArrayBuffer) {
        this.width = width;
        this.height = height;
        this.image = image;
        this.complex = complex;
        this.buffer = buffer;
    }

    public getDTO(): IChunkConfig {
        return {
            width: this.width,
            height: this.height,
            image: this.image.getDTO(),
            complex: this.complex.getDTO(),
            buffer: this.buffer
        };
    }

}
