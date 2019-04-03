import { ChunkConfig, IBuffers, IChunkConfig, IChunkResult } from 'Fractal/ChunkConfig.js';
import { Config, IConfig } from 'Fractal/Config.js';
import { NumberRange } from 'Fractal/NumberRange.js';
import { ITaskResult, Scheduler } from 'Fractal/Scheduler.js';
import { Color } from 'Sandbox/Color.js';
import { IRectangle, Rectangle } from 'Sandbox/Rectangle.js';
import { Vector } from 'Sandbox/Vector.js';

interface IModuleWindow extends Window {
    Module: any;
}

declare var WebAssembly: any;
declare var Module: any;

export enum RenderMode {
    TRANSFERRED,
    SHARED,
    WASM,
}

type IterateChunk = (config: IConfig, chunkConfig: IChunkConfig, buffers?: IBuffers) => ITaskResult | Promise<ITaskResult>;
type ColorChunk = (config: IConfig, chunkConfig: IChunkConfig, buffers: IBuffers, total: number) => ITaskResult | Promise<ITaskResult>;

export class Mandelbrot {

    private static iterateChunk(config: IConfig, chunkConfig: IChunkConfig, buffers?: IBuffers) {
        const NumberRange = (self as any).NumberRange;

        const histogram = new Uint32Array(config.iterations);
        const iterations = buffers ? buffers.iterations : new Uint32Array(chunkConfig.image.width * chunkConfig.image.height);
        const fractionals = buffers ? buffers.fractionals : new Float64Array(chunkConfig.image.width * chunkConfig.image.height);

        const widthRange = new NumberRange(chunkConfig.image.start.x, chunkConfig.image.end.x);
        const heightRange = new NumberRange(chunkConfig.image.start.y, chunkConfig.image.end.y);
        const realRange = new NumberRange(chunkConfig.complex.start.x, chunkConfig.complex.end.x);
        const imaginaryRange = new NumberRange(chunkConfig.complex.start.y, chunkConfig.complex.end.y);

        let total = 0;
        let index = buffers ? chunkConfig.image.start.y * chunkConfig.width + chunkConfig.image.start.x : 0;
        for (let y = chunkConfig.image.start.y; y < chunkConfig.image.end.y; ++y) {
            for (let x = chunkConfig.image.start.x; x < chunkConfig.image.end.x; ++x, ++index) {
                const i0 = NumberRange.Scale(widthRange, x, realRange);
                const j0 = NumberRange.Scale(heightRange, y, imaginaryRange);

                const jj0 = j0 * j0;
                let q = (i0 - 0.25);
                q *= q;
                q += jj0;

                if (q * (q + (i0 - 0.25)) < 0.25 * jj0) {
                    iterations[index] = config.iterations;
                } else {
                    let iteration = 0;
                    let ii = 0;
                    let jj = 0;
                    for (let i = 0, j = 0; ii + jj < Math.pow(2, 16) && iteration < config.iterations; ii = i * i, jj = j * j, ++iteration) {
                        const itemp = ii - jj + i0;
                        const jtemp = 2 * i * j + j0;
                        if (i === itemp && j === jtemp) {
                            iteration = config.iterations;
                            break;
                        }
                        i = itemp;
                        j = jtemp;
                    }
                    iterations[index] = iteration;
                    if (iteration < config.iterations) {
                        ++histogram[iteration];
                        ++total;
                        fractionals[index] = (iteration + 1 - Math.log(Math.log(ii + jj) / 2 / Math.LN2) / Math.LN2) % 1;
                    }
                }
            }
            if (buffers) {
                index += chunkConfig.width - chunkConfig.image.width;
            }
        }

        if (buffers) {
            buffers.histogram = histogram;
            return { result: { buffers, total, chunkConfig }, transferables: [histogram.buffer] };
        }
        return {
            result: { buffers: { histogram, iterations, fractionals }, total, chunkConfig },
            transferables: [
                histogram.buffer,
                iterations.buffer,
                fractionals.buffer,
            ],
        };
    }

    private static colorChunk(config: IConfig, chunkConfig: IChunkConfig, buffers: IBuffers, total: number) {
        const Color = (self as any).Color;

        const gradient = (n: number) => {
            return new Color(
                Math.floor(255 * n * config.red),
                Math.floor(255 * n * config.green),
                Math.floor(255 * n * config.blue),
            );
        };

        const pixels = buffers.pixels ? buffers.pixels : new Uint32Array(chunkConfig.image.width * chunkConfig.image.height);
        let index = buffers.pixels ? chunkConfig.image.start.y * chunkConfig.width + chunkConfig.image.start.x : 0;
        for (let y = chunkConfig.image.start.y; y < chunkConfig.image.end.y; ++y) {
            for (let x = chunkConfig.image.start.x; x < chunkConfig.image.end.x; ++x, ++index) {
                const iteration = buffers.iterations[index];
                if (iteration < config.iterations) {
                    let hue = 0;
                    for (let i = 0; i < iteration; ++i) {
                        hue += buffers.histogram[i] / total;
                    }
                    const color1 = gradient(hue);
                    const color2 = gradient(hue + buffers.histogram[iteration] / total);
                    pixels[index] = Color.Lerp(color1, color2, buffers.fractionals[index]).abgr();
                } else {
                    pixels[index] = Color.Black.abgr();
                }
            }
            if (buffers.pixels) {
                index += chunkConfig.width - chunkConfig.image.width;
            }
        }

        return { result: { pixels, chunkConfig }, transferables: buffers.pixels ? [] : [pixels.buffer] };
    }

    private static iterateChunkWasm(config: IConfig, chunkConfig: IChunkConfig) {
        return new Promise((resolve, reject) => {
            if (typeof Module === 'undefined') {
                const Module = (self as IModuleWindow).Module = {
                    locateFile: (file: string) => 'http://localhost:8000/build/src/cpp/' + file,
                    onRuntimeInitialized: () => {
                        resolve(Module);
                    },
                };
                System.import('http://localhost:8000/build/src/cpp/mandelbrot.js');
            } else {
                resolve(Module);
            }
        }).then((Module: any) => {
            const rawConfig = JSON.stringify(config);
            console.dir(rawConfig);
            const rawConfigLength = Module.lengthBytesUTF8(rawConfig) + 1;
            const rawConfigOffset = Module._malloc(rawConfigLength);
            Module.stringToUTF8(rawConfig, rawConfigOffset, rawConfigLength);

            const rawChunkConfig = JSON.stringify(chunkConfig);
            console.dir(rawChunkConfig);
            const rawChunkConfigLength = Module.lengthBytesUTF8(rawChunkConfig) + 1;
            const rawChunkConfigOffset = Module._malloc(rawChunkConfigLength);
            Module.stringToUTF8(rawChunkConfig, rawChunkConfigOffset, rawChunkConfigLength);

            const chunkResultOffset = Module.ccall('iterateChunk', 'number', ['number', 'number'], [rawConfigOffset, rawChunkConfigOffset]);
            const chunkResult = new Uint32Array(Module.HEAPU32.slice(chunkResultOffset / 4, chunkResultOffset / 4 + 4));
            Module._free(chunkResultOffset);

            const histogramOffset = chunkResult[0];
            const histogram = new Uint32Array(Module.HEAPU32.slice(histogramOffset / 4, histogramOffset / 4 + config.iterations));
            Module._free(histogramOffset);

            const iterationsOffset = chunkResult[1];
            const iterations = new Uint32Array(Module.HEAPU32.slice(iterationsOffset / 4, iterationsOffset / 4 + chunkConfig.image.width * chunkConfig.image.height));
            Module._free(iterationsOffset);

            const fractionalsOffset = chunkResult[2];
            const fractionals = new Float64Array(Module.HEAPF64.slice(fractionalsOffset / 8, fractionalsOffset / 8 + chunkConfig.image.width * chunkConfig.image.height));
            Module._free(fractionalsOffset);

            const total = chunkResult[3];

            Module._free(rawConfigOffset);
            Module._free(rawChunkConfigOffset);

            return {
                result: { buffers: { histogram, iterations, fractionals }, total, chunkConfig },
                transferables: [
                    histogram.buffer,
                    iterations.buffer,
                    fractionals.buffer,
                ],
            };
        });
    }

    private static colorChunkWasm(config: IConfig, chunkConfig: IChunkConfig, buffers: IBuffers, total: number) {
        return new Promise((resolve, reject) => {
            if (typeof Module === 'undefined') {
                const Module = (self as IModuleWindow).Module = {
                    locateFile: (file: string) => 'http://localhost:8000/build/src/cpp/' + file,
                    onRuntimeInitialized: () => {
                        resolve(Module);
                    },
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

            const rawBuffersOffset = Module._malloc(12);
            const rawBuffers = new Uint32Array(Module.HEAPU32.buffer, rawBuffersOffset, 3);

            const rawHistogramOffset = rawBuffers[0] = Module._malloc(config.iterations * 4);
            const rawHistogram = new Uint32Array(Module.HEAPU32.buffer, rawHistogramOffset, config.iterations);
            rawHistogram.set(buffers.histogram);

            const rawIterationsOffset = rawBuffers[1] = Module._malloc(chunkConfig.image.width * chunkConfig.image.height * 4);
            const rawIterations = new Uint32Array(Module.HEAPU32.buffer, rawIterationsOffset, chunkConfig.image.width * chunkConfig.image.height);
            rawIterations.set(buffers.iterations);

            const rawFractionalsOffset = rawBuffers[2] = Module._malloc(chunkConfig.image.width * chunkConfig.image.height * 8);
            const rawFractionals = new Float64Array(Module.HEAPF64.buffer, rawFractionalsOffset, chunkConfig.image.width * chunkConfig.image.height);
            rawFractionals.set(buffers.fractionals);

            const pixelsOffset = Module.ccall('colorChunk', 'number', ['number', 'number', 'number', 'number'], [rawConfigOffset, rawChunkConfigOffset, rawBuffersOffset, total]);
            const pixels = new Uint32Array(Module.HEAPU32.slice(pixelsOffset / 4, pixelsOffset / 4 + chunkConfig.image.width * chunkConfig.image.height));

            Module._free(pixelsOffset);
            Module._free(rawHistogramOffset);
            Module._free(rawIterationsOffset);
            Module._free(rawFractionalsOffset);
            Module._free(rawBuffersOffset);
            Module._free(rawConfigOffset);
            Module._free(rawChunkConfigOffset);

            return {
                result: { pixels, chunkConfig },
                transferables: [pixels.buffer],
            };
        });
    }

    private readonly _chunkSize = 256;

    private readonly _canvas: HTMLCanvasElement;
    private readonly _context: CanvasRenderingContext2D;

    private readonly _width: number;
    private readonly _height: number;

    private readonly _widthRange: NumberRange;
    private readonly _heightRange: NumberRange;

    private readonly _iterateScheduler: Scheduler<IterateChunk>;
    private readonly _colorScheduler: Scheduler<ColorChunk>;

    private readonly _wasmIterateScheduler?: Scheduler<IterateChunk>;
    private readonly _wasmColorScheduler?: Scheduler<ColorChunk>;

    private _buffers?: IBuffers;

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

        this._iterateScheduler = new Scheduler(Mandelbrot.iterateChunk, {
            'http://localhost:8000/build/src/ts/Fractal/NumberRange.js': ['NumberRange'],
        });

        this._colorScheduler = new Scheduler(Mandelbrot.colorChunk, {
            'http://localhost:8000/build/src/ts/Sandbox/Color.js': ['Color'],
        });

        if (typeof WebAssembly !== 'undefined') {
            this._wasmIterateScheduler = new Scheduler(Mandelbrot.iterateChunkWasm);
            this._wasmColorScheduler = new Scheduler(Mandelbrot.colorChunkWasm);
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
        return Promise.all(
            this.createChunks(config.rectangle).map((chunk) => this._iterateScheduler.apply([config.getDTO(), chunk.getDTO()])),
        ).then((results: IChunkResult[]) => {
            const { histogram, total } = this.getHistogram(config, results);
            return Promise.all(results.map(({ buffers, chunkConfig }) => {
                buffers.histogram = histogram;
                return this._colorScheduler.apply(
                    [config.getDTO(), chunkConfig, buffers, total],
                    [buffers.iterations.buffer, buffers.fractionals.buffer],
                ).then(({ pixels }) => {
                    this._context.putImageData(
                        new ImageData(new Uint8ClampedArray(pixels.buffer), chunkConfig.image.width, chunkConfig.image.height),
                        chunkConfig.image.start.x,
                        chunkConfig.image.start.y,
                    );
                });
            }));
        });
    }

    private renderShared(config: Config) {
        if (typeof SharedArrayBuffer === 'undefined') {
            throw new Error('No SharedArrayBuffer support');
        }
        this._buffers = {
            histogram: new Uint32Array(new SharedArrayBuffer(config.iterations * Uint32Array.BYTES_PER_ELEMENT)),
            iterations: new Uint32Array(new SharedArrayBuffer(this._width * this._height * Uint32Array.BYTES_PER_ELEMENT)),
            fractionals: new Float64Array(new SharedArrayBuffer(this._width * this._height * Float64Array.BYTES_PER_ELEMENT)),
            pixels: new Uint32Array(new SharedArrayBuffer(this._width * this._height * Uint32Array.BYTES_PER_ELEMENT)),
        };
        return Promise.all(
            this.createChunks(config.rectangle, this._buffers).map((chunk) => this._iterateScheduler.apply([config.getDTO(), chunk.getDTO(), this._buffers])),
        ).then((results: IChunkResult[]) => {
            const { histogram, total } = this.getHistogram(config, results);
            return Promise.all(results.map(({ buffers, chunkConfig }) => {
                buffers.histogram = histogram;
                return this._colorScheduler.apply([config.getDTO(), chunkConfig, buffers, total]);
            }));
        }).then(() => {
            // Cannot pass SharedArrayBuffer views to ImageData
            const buffer_view = new Uint8ClampedArray(this._buffers!.pixels!.buffer);
            const array_buffer = new ArrayBuffer(buffer_view.byteLength);
            const array_buffer_view = new Uint8ClampedArray(array_buffer);
            array_buffer_view.set(buffer_view);
            this._context.putImageData(new ImageData(array_buffer_view, this._width, this._height), 0, 0);
            this._buffers = undefined;
        });
    }

    private renderWasm(config: Config) {
        if (typeof WebAssembly === 'undefined') {
            throw new Error('No WebAssembly support');
        }
        return Promise.all(
            this.createChunks(config.rectangle).map((chunk) => this._wasmIterateScheduler!.apply([config.getDTO(), chunk.getDTO()])),
        ).then((results: IChunkResult[]) => {
            const { histogram, total } = this.getHistogram(config, results);
            return Promise.all(results.map(({ buffers, chunkConfig }) => {
                buffers.histogram = histogram;
                return this._wasmColorScheduler!.apply(
                    [config.getDTO(), chunkConfig, buffers, total],
                    [buffers.iterations.buffer, buffers.fractionals.buffer],
                ).then(({ pixels }) => {
                    this._context.putImageData(
                        new ImageData(new Uint8ClampedArray(pixels.buffer), chunkConfig.image.width, chunkConfig.image.height),
                        chunkConfig.image.start.x,
                        chunkConfig.image.start.y,
                    );
                });
            }));
        });
    }

    private createChunks(rectangle: Rectangle, buffers?: IBuffers) {
        const realRange = new NumberRange(rectangle.start.x, rectangle.end.x);
        const imaginaryRange = new NumberRange(rectangle.start.y, rectangle.end.y);

        const chunks: ChunkConfig[] = [];
        for (let x = 0; x < this._width; x += this._chunkSize) {
            const chunkWidth = x + this._chunkSize > this._width ? this._width - x : this._chunkSize;
            for (let y = 0; y < this._height; y += this._chunkSize) {
                const chunkHeight = y + this._chunkSize > this._height ? this._height - y : this._chunkSize;
                const screenStart = new Vector(x, y);
                const screenEnd = new Vector(x + chunkWidth, y + chunkHeight);
                chunks.push(new ChunkConfig(
                    this._width,
                    this._height,
                    new Rectangle(screenStart, screenEnd),
                    new Rectangle(
                        new Vector(
                            NumberRange.Scale(this._widthRange, x, realRange),
                            NumberRange.Scale(this._heightRange, y, imaginaryRange),
                        ),
                        new Vector(
                            NumberRange.Scale(this._widthRange, x + chunkWidth, realRange),
                            NumberRange.Scale(this._heightRange, y + chunkHeight, imaginaryRange),
                        ),
                    ),
                    buffers,
                ));
            }
        }
        return chunks;
    }

    private getHistogram(config: Config, results: IChunkResult[]) {
        const histogram = this._buffers ? this._buffers.histogram : new Uint32Array(config.iterations);
        results.forEach((result) => {
            result.buffers.histogram.forEach((iterations, index) => {
                histogram[index] += iterations;
            });
        });
        const total = results.reduce((acc, cur) => acc + cur.total, 0);
        return { histogram, total };
    }

}
