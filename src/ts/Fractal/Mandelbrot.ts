import { Rectangle, IRectangle } from 'Fractal/Rectangle';
import { NumberRange } from 'Fractal/NumberRange';
import { Color } from 'Fractal/Color';
import { Scheduler } from 'Fractal/Scheduler';
import { Point } from 'Fractal/Point';
import { Config, IConfig } from 'Fractal/Config';
import { ChunkConfig, IChunkConfig } from 'Fractal/ChunkConfig';

interface IModuleWindow extends Window {
    Module: any;
}

declare var WebAssembly: any;
declare var Module: any;

export enum RenderMode {
    TRANSFERRED,
    SHARED,
    WASM
}

export class Mandelbrot {

    private readonly _chunkSize = 256;

    private readonly _canvas: HTMLCanvasElement;
    private readonly _context: CanvasRenderingContext2D;

    private readonly _width: number;
    private readonly _height: number;

    private readonly _widthRange: NumberRange;
    private readonly _heightRange: NumberRange;

    private readonly _scheduler: Scheduler;
    private readonly _wasmScheduler?: Scheduler;
    private readonly _buffer?: SharedArrayBuffer;

    constructor(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this._width = this._canvas.width;
        this._height = this._canvas.height;

        this._widthRange = new NumberRange(0, this._width);
        this._heightRange = new NumberRange(0, this._height);

        const context = this._canvas.getContext('2d');
        if (!context) {
            throw new Error('Unable to get context');
        }
        this._context = context;

        this._scheduler = new Scheduler(this.renderChunk, {
            'Fractal/Color': ['Color'],
            'Fractal/NumberRange': ['NumberRange']
        });

        if (typeof WebAssembly !== 'undefined') {
            this._wasmScheduler = new Scheduler(this.renderChunkWasm);
        }

        if (typeof SharedArrayBuffer !== 'undefined') {
            this._buffer = new SharedArrayBuffer(this._width * this._height * 4);
        }
    }

    public render(mode: RenderMode, config: Config): Promise<any> {
        switch (mode) {
            case RenderMode.TRANSFERRED:
                return this.renderTransferred(config);

            case RenderMode.SHARED:
                return this.renderShared(config);

            case RenderMode.WASM:
                return this.renderWasm(config);
        }
    }

    private renderTransferred(config: Config) {
        return Promise.all(this.createChunks(config.rectangle).map((chunk) => this._scheduler.apply([config.getDTO(), chunk.getDTO()]).then(({ data, chunkConfig }: { data: Uint32Array, chunkConfig: IChunkConfig }) => {
            this._context.putImageData(
                new ImageData(new Uint8ClampedArray(data.buffer), chunkConfig.image.width, chunkConfig.image.height),
                chunkConfig.image.start.x,
                chunkConfig.image.start.y
            );
        })));
    }

    private renderShared(config: Config) {
        if (this._buffer) {
            return Promise.all(this.createChunks(config.rectangle, this._buffer).map((chunk) => this._scheduler.apply([config.getDTO(), chunk.getDTO()]))).then(() => {
                // Cannot pass SharedArrayBuffer views to ImageData
                const buffer_view = new Uint8ClampedArray(<SharedArrayBuffer> this._buffer);
                const array_buffer = new ArrayBuffer(buffer_view.byteLength);
                const array_buffer_view = new Uint8ClampedArray(array_buffer);
                array_buffer_view.set(buffer_view);
                this._context.putImageData(new ImageData(array_buffer_view, this._width, this._height), 0, 0);
            });
        }
        return Promise.reject('No SharedArrayBuffer support');
    }

    private renderWasm(config: Config) {
        if (this._wasmScheduler) {
            return Promise.all(this.createChunks(config.rectangle).map((chunk) => this._wasmScheduler!.apply([config.getDTO(), chunk.getDTO()]).then(({ data, chunkConfig }: { data: Uint32Array, chunkConfig: IChunkConfig }) => {
                this._context.putImageData(
                    new ImageData(new Uint8ClampedArray(data.buffer), chunkConfig.image.width, chunkConfig.image.height),
                    chunkConfig.image.start.x,
                    chunkConfig.image.start.y
                );
            })));
        }
        return Promise.reject('No WebAssembly support');
    }

    private createChunks(rectangle: Rectangle, buffer?: SharedArrayBuffer) {
        const realRange = new NumberRange(rectangle.start.x, rectangle.end.x);
        const imaginaryRange = new NumberRange(rectangle.start.y, rectangle.end.y);

        const chunks: ChunkConfig[] = [];
        for (let x = 0; x < this._width; x += this._chunkSize) {
            const chunkWidth = x + this._chunkSize > this._width ? this._width - x : this._chunkSize;
            for (let y = 0; y < this._height; y += this._chunkSize) {
                const chunkHeight = y + this._chunkSize > this._height ? this._height - y : this._chunkSize;
                const screenStart = new Point(x, y);
                const screenEnd = new Point(x + chunkWidth, y + chunkHeight);
                chunks.push(new ChunkConfig(
                    this._width,
                    this._height,
                    new Rectangle(screenStart, screenEnd),
                    new Rectangle(
                        new Point(
                            NumberRange.Scale(this._widthRange, x, realRange),
                            NumberRange.Scale(this._heightRange, y, imaginaryRange)
                        ),
                        new Point(
                            NumberRange.Scale(this._widthRange, x + chunkWidth, realRange),
                            NumberRange.Scale(this._heightRange, y + chunkHeight, imaginaryRange)
                        )
                    ),
                    buffer
                ));
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

    private renderChunkWasm(config: IConfig, chunkConfig: IChunkConfig) {
        return new Promise((resolve, reject) => {
            if (typeof Module === 'undefined') {
                const Module = (<IModuleWindow> self).Module = {
                    ENVIRONMENT: 'WORKER',
                    wasmBinaryFile: 'http://localhost:8000/build/src/cpp/mandelbrot.wasm',
                    _main: () => {
                        resolve(Module);
                    }
                };
                System.import('http://localhost:8000/build/src/cpp/mandelbrot.js');
            } else {
                resolve(Module);
            }
        }).then((Module: any) => {
            const rawConfig = JSON.stringify(config);
            const rawConfigLength = Module.lengthBytesUTF8(rawConfig) + 1;
            const rawConfigOffset = Module._malloc(rawConfigLength);
            Module.stringToUTF8(rawConfig, rawConfigOffset, rawConfigLength);

            const rawChunkConfig = JSON.stringify(chunkConfig);
            const rawChunkConfigLength = Module.lengthBytesUTF8(rawChunkConfig) + 1;
            const rawChunkConfigOffset = Module._malloc(rawChunkConfigLength);
            Module.stringToUTF8(rawChunkConfig, rawChunkConfigOffset, rawChunkConfigLength);

            const dataOffset = Module.ccall('iterate', 'number', ['number', 'number'], [rawConfigOffset, rawChunkConfigOffset]);
            const dataView = new Uint32Array(Module.HEAPU32.slice(dataOffset / 4, dataOffset / 4 + chunkConfig.image.width * chunkConfig.image.height));

            Module._free(dataOffset);
            Module._free(rawConfigOffset);
            Module._free(rawChunkConfigOffset);

            return [{ data: dataView, chunkConfig }, []];
        });
    }

}
