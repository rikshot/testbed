import { IConfig } from 'Fractal/Mandelbrot';
import { Rectangle, IRectangle } from 'Fractal/Rectangle';
import { NumberRange } from 'Fractal/NumberRange';
import { Color } from 'Fractal/Color';
import { Scheduler } from 'Fractal/Scheduler';
import { Point } from 'Fractal/Point';

export interface IConfig {
    iterations: number;
    red: number;
    green: number;
    blue: number;
    rectangle: Rectangle;
}

interface IChunkConfig {
    width: number;
    height: number;
    image: IRectangle;
    complex: IRectangle;
    buffer?: SharedArrayBuffer;
}

export class Mandelbrot {

    private readonly _chunkSize = 256;

    private readonly _canvas: HTMLCanvasElement;
    private readonly _context: CanvasRenderingContext2D;

    private readonly _width: number;
    private readonly _height: number;

    private readonly _widthRange: NumberRange;
    private readonly _heightRange: NumberRange;

    private readonly _realRange: NumberRange;
    private readonly _imaginaryRange: NumberRange;

    private readonly _buffer?: SharedArrayBuffer;

    private readonly _scheduler: Scheduler;

    constructor(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this._width = this._canvas.width = 1920;
        this._height = this._canvas.height = 1080;

        this._widthRange = new NumberRange(0, this._width);
        this._heightRange = new NumberRange(0, this._height);

        this._realRange = new NumberRange(-2.5, 1.0);
        this._imaginaryRange = new NumberRange(-1.0, 1.0);

        if (typeof SharedArrayBuffer !== 'undefined') {
            this._buffer = new SharedArrayBuffer(this._width * this._height * 4);
        }

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
        if (!this._buffer) {
            return this.renderTransfered(config);
        }
        return this.renderShared(config);
    }

    private renderTransfered(config: IConfig) {
        return Promise.all(this.createChunks().map((chunk) => this._scheduler.apply([config, chunk]).then(({ data, chunkConfig }: { data: Uint32Array, chunkConfig: IChunkConfig }) => {
            this._context.putImageData(
                new ImageData(new Uint8ClampedArray(data.buffer), chunkConfig.image.width, chunkConfig.image.height),
                chunkConfig.image.start.x,
                chunkConfig.image.start.y
            );
        })));
    }

    private renderShared(config: IConfig) {
        return Promise.all(this.createChunks(this._buffer).map((chunk) => this._scheduler.apply([config, chunk]))).then(() => {
            // Cannot pass SharedArrayBuffer views to ImageData
            const buffer_view = new Uint8ClampedArray(<SharedArrayBuffer> this._buffer);
            const array_buffer = new ArrayBuffer(buffer_view.byteLength);
            const array_buffer_view = new Uint8ClampedArray(array_buffer);
            array_buffer_view.set(buffer_view);
            this._context.putImageData(new ImageData(array_buffer_view, this._width, this._height), 0, 0);
        });
    }

    private createChunks(buffer?: SharedArrayBuffer) {
        const chunks: IChunkConfig[] = [];
        for (let x = 0; x < this._width; x += this._chunkSize) {
            const chunkWidth = x + this._chunkSize > this._width ? this._width - x : this._chunkSize;
            for (let y = 0; y < this._height; y += this._chunkSize) {
                const chunkHeight = y + this._chunkSize > this._height ? this._height - y : this._chunkSize;
                const screenStart = new Point(x, y);
                const screenEnd = new Point(x + chunkWidth, y + chunkHeight);
                chunks.push({
                    width: this._width,
                    height: this._height,
                    image: new Rectangle(screenStart, screenEnd).getDTO(),
                    complex: new Rectangle(
                        new Point(
                            NumberRange.Scale(this._widthRange, x, this._realRange),
                            NumberRange.Scale(this._heightRange, y, this._imaginaryRange)
                        ),
                        new Point(
                            NumberRange.Scale(this._widthRange, x + chunkWidth, this._realRange),
                            NumberRange.Scale(this._heightRange, y + chunkHeight, this._imaginaryRange)
                        )
                    ).getDTO(),
                    buffer
                });
            }
        }
        return chunks;
    }

    private renderChunk(config: IConfig, chunkConfig: IChunkConfig) {
        const Color = (<any> self).Color;
        const NumberRange = (<any> self).NumberRange;

        const log2 = Math.log(2);

        let data: Uint32Array;
        if (chunkConfig.buffer) {
            data = new Uint32Array(chunkConfig.buffer);
        } else {
            data = new Uint32Array(chunkConfig.image.width * chunkConfig.image.height);
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

        const widthRange = new NumberRange(chunkConfig.image.start.x, chunkConfig.image.end.x);
        const heightRange = new NumberRange(chunkConfig.image.start.y, chunkConfig.image.end.y);
        const realRange = new NumberRange(chunkConfig.complex.start.x, chunkConfig.complex.end.x);
        const imaginaryRange = new NumberRange(chunkConfig.complex.start.y, chunkConfig.complex.end.y);

        let index = chunkConfig.buffer ? chunkConfig.image.start.y * chunkConfig.width + chunkConfig.image.start.x : 0;
        for (let y = chunkConfig.image.start.y; y < chunkConfig.image.end.y; ++y) {
            for (let x = chunkConfig.image.start.x; x < chunkConfig.image.end.x; ++x, ++index) {
                const i0 = NumberRange.Scale(widthRange, x, realRange);
                const j0 = NumberRange.Scale(heightRange, y, imaginaryRange);

                const jj0 = j0 * j0;
                let q = (i0 - 0.25);
                q *= q;
                q += jj0;

                let color = Color.Black;
                if (q * (q + (i0 - 0.25)) >= 0.25 * jj0) {
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
                        color = Color.Lerp(color1, color2, iterations % 1);
                    }
                }
                data[index] = color.abgr();
            }
            if (chunkConfig.buffer) {
                index += chunkConfig.width - chunkConfig.image.width;
            }
        }

        if (!chunkConfig.buffer) {
            return [{ data, chunkConfig }, [data.buffer]];
        }
        return [{ chunkConfig }, []];
    }

}
