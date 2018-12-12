import { IRectangle, Rectangle } from 'Sandbox/Rectangle.js';

export interface IBuffers {
    histogram: Uint32Array;
    iterations: Uint32Array;
    fractionals: Float64Array;
    pixels?: Uint32Array;
}

export interface IChunkConfig {
    width: number;
    height: number;
    image: IRectangle;
    complex: IRectangle;
    buffers?: IBuffers;
}

export interface IChunkResult {
    buffers: IBuffers;
    total: number;
    chunkConfig: IChunkConfig;
}

export class ChunkConfig {

    public readonly width: number;
    public readonly height: number;
    public readonly image: Rectangle;
    public readonly complex: Rectangle;
    public readonly buffers?: IBuffers;

    constructor(width: number, height: number, image: Rectangle, complex: Rectangle, buffers?: IBuffers) {
        this.width = width;
        this.height = height;
        this.image = image;
        this.complex = complex;
        this.buffers = buffers;
    }

    public getDTO(): IChunkConfig {
        return {
            width: this.width,
            height: this.height,
            image: this.image.getDTO(),
            complex: this.complex.getDTO(),
            buffers: this.buffers,
        };
    }

}
