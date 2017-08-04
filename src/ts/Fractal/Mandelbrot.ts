import { NumberRange } from 'Fractal/NumberRange';
import { Color } from 'Fractal/Color';
import { Scheduler } from 'Fractal/Scheduler';

export interface IConfig {
    iterations: number;
    red: number;
    green: number;
    blue: number;
}

interface IChunkConfig {
    width: number;
    height: number;
    start: number;
    end: number;
    buffer?: ArrayBuffer;
}

export class Mandelbrot {

    private readonly _canvas: HTMLCanvasElement;
    private readonly _width: number;
    private readonly _height: number;
    private readonly _context: CanvasRenderingContext2D;

    private readonly _scheduler: Scheduler<{ data: Uint32Array, chunkConfig: IChunkConfig }>;

    constructor(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this._width = this._canvas.width = 1920;
        this._height = this._canvas.height = 1080;

        const context = this._canvas.getContext('2d');
        if (!context) {
            throw new Error('Unable to get context');
        }
        this._context = context;

        this._scheduler = new Scheduler(this.renderChunk, {
            'Fractal/Color': ['Color'],
            'Fractal/NumberRange': ['NumberRange']
        });
    }

    public render(config: IConfig) {
        if (typeof SharedArrayBuffer === 'undefined') {
            return this.renderTransfered(config);
        }
        return this.renderShared(config);
    }

    private renderTransfered(config: IConfig) {
        const slice = Math.floor(this._height / navigator.hardwareConcurrency);
        const promises = [];
        for (let i = 0; i < navigator.hardwareConcurrency; ++i) {
            const start = i * slice;
            const chunkConfig = {
                width: this._width,
                height: this._height,
                start,
                end: start + slice
            };
            promises.push(this._scheduler.apply([config, chunkConfig]));
        }
        return Promise.all(promises).then((results) => {
            for (const { data, chunkConfig } of results) {
                this._context.putImageData(new ImageData(new Uint8ClampedArray(data.buffer), this._width, slice), 0, chunkConfig.start);
            }
        });
    }

    private renderShared(config: IConfig) {
        const slice = Math.floor(this._height / navigator.hardwareConcurrency);
        const stride = this._width * 4;
        const buffer = new SharedArrayBuffer(this._height * stride);

        const promises = [];
        for (let i = 0; i < navigator.hardwareConcurrency; ++i) {
            const start = i * slice;
            const chunkConfig = {
                width: this._width,
                height: this._height,
                start,
                end: start + slice
            };
            promises.push(this._scheduler.apply([config, chunkConfig]));
        }
        return Promise.all(promises).then((results) => {
            for (const { data, chunkConfig } of results) {
                // Cannot pass SharedArrayBuffer views to ImageData
                const buffer_view = new Uint8ClampedArray(data.buffer);
                const array_buffer = new ArrayBuffer(buffer_view.byteLength);
                const array_buffer_view = new Uint8ClampedArray(array_buffer);
                array_buffer_view.set(buffer_view);
                this._context.putImageData(new ImageData(array_buffer_view, this._width, slice), 0, chunkConfig.start);
            }
        });
    }

    private renderChunk(config: IConfig, chunkConfig: IChunkConfig) {
        const Color = (<any> self).Color;
        const NumberRange = (<any> self).NumberRange;

        const log2 = Math.log(2);

        const stride = chunkConfig.width;
        const rows = chunkConfig.end - chunkConfig.start;
        let data: Uint32Array;
        if (chunkConfig.buffer) {
            data = new Uint32Array(chunkConfig.buffer, chunkConfig.start * stride, rows * stride);
        } else {
            data = new Uint32Array(rows * stride);
        }

        const colors = [];
        for (let i = 0; i <= config.iterations; ++i) {
            const percentage = i / config.iterations;
            colors.push(new Color(
                Math.min(255, Math.floor(255 * percentage * config.red)),
                Math.min(255, Math.floor(255 * percentage * config.green)),
                Math.min(255, Math.floor(255 * percentage * config.blue))
            ));
        }

        const widthRange = new NumberRange(0, chunkConfig.width);
        const heightRange = new NumberRange(0, chunkConfig.height);
        const realRange = new NumberRange(-2.5, 1.0);
        const imaginaryRange = new NumberRange(-1.0, 1.0);

        let index = 0;
        for (let y = chunkConfig.start; y < chunkConfig.end; ++y) {
            for (let x = 0; x < chunkConfig.width; ++x) {
                const i0 = NumberRange.Scale(widthRange, x, realRange);
                const j0 = NumberRange.Scale(heightRange, y, imaginaryRange);

                const jj0 = j0 * j0;
                let q = (i0 - 0.25);
                q *= q;
                q += jj0;

                if (q * (q + (i0 - 0.25)) < 0.25 * jj0) {
                    data[index++] = Color.Black.value();
                } else {
                    let iterations = 0;
                    let ii = 0;
                    let jj = 0;
                    for (let i = 0, j = 0; ii + jj < Math.pow(2, 16) && iterations < config.iterations; ii = i * i, jj = j * j, ++iterations) {
                        const itemp = ii - jj + i0;
                        const jtemp = 2 * i * j + j0;
                        if (i === itemp && j === jtemp) {
                            iterations = config.iterations;
                            break;
                        }
                        i = itemp;
                        j = jtemp;
                    }
                    if (iterations < config.iterations) {
                        iterations += 1 - Math.log(Math.log(ii + jj) / 2 / log2) / log2;
                        const color1 = colors[Math.floor(iterations)];
                        const color2 = colors[Math.floor(iterations) + 1];
                        data[index++] = Color.Lerp(color1, color2, iterations % 1).value();
                    } else {
                        data[index++] = Color.Black.value();
                    }
                }
            }
        }

        return { data, chunkConfig };
    }

}
