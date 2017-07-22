interface IConfig {
    density: number;
    colors: number;
    iterations: number;
    red: number;
    green: number;
    blue: number;
}

interface IThreadConfig {
    width: number;
    height: number;
    buffer?: SharedArrayBuffer;
    start: number;
    end: number;
    config: IConfig;
}

const threadCount = 8;

const threads: Worker[] = [];
for (let i = 0; i < threadCount; ++i) {
    threads.push(new Worker('ts/Fractal/Workers/Thread.js'));
}

const render = (canvas: HTMLCanvasElement, config: IConfig) => {
    return new Promise((resolve, reject) => {
        const width = canvas.width = 1920;
        const height = canvas.height = 1080;

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Unable to get context');
        }

        const slice = Math.floor(height / threadCount);
        let done = 0;
        for (let i = 0; i < threadCount; ++i) {
            const thread = threads[i];
            const start = i * slice;
            const onMessage = (event: MessageEvent) => {
                const data = new Uint8ClampedArray(event.data);
                context.putImageData(new ImageData(data, width, slice), 0, start);
                if (++done === threadCount) {
                    resolve();
                }
                thread.removeEventListener('message', onMessage);
            };
            thread.addEventListener('message', onMessage);
            thread.postMessage(<IThreadConfig> {
                width,
                height,
                start,
                end: start + slice,
                config
            });
        }
    });
};

const renderShared = (canvas: HTMLCanvasElement, config: IConfig) => {
    return new Promise((resolve, reject) => {
        const width = canvas.width = 1920;
        const height = canvas.height = 1080;

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Unable to get context');
        }

        const slice = Math.floor(height / threadCount);
        const stride = width * 4;
        const buffer = new SharedArrayBuffer(height * stride);

        let done = 0;
        for (let i = 0; i < threadCount; ++i) {
            const thread = threads[i];
            const start = i * slice;
            const end = start + slice;

            const onMessage = (event: MessageEvent) => {
                const buffer_view = new Uint8ClampedArray(buffer, start * stride, slice * stride);
                const array_buffer = new ArrayBuffer(buffer_view.byteLength);
                const array_buffer_view = new Uint8ClampedArray(array_buffer);
                array_buffer_view.set(buffer_view);
                context.putImageData(new ImageData(array_buffer_view, width, slice), 0, start);
                if (++done === threadCount) {
                    resolve();
                }
                thread.removeEventListener('message', onMessage);
            };
            thread.addEventListener('message', onMessage);

            thread.postMessage(<IThreadConfig> {
                width,
                height,
                buffer,
                start,
                end,
                config
            });
        }
    });
};

const getConfig = (): IConfig => {
    return Object.entries({
        density: 'integer',
        colors: 'integer',
        iterations: 'integer',
        red: 'float',
        green: 'float',
        blue: 'float'
    }).reduce((config: any, [key, type]) => {
        const rawValue = (<HTMLInputElement> document.getElementById(key)).value;
        config[key] = type === 'integer' ? parseInt(rawValue, 10) : parseFloat(rawValue);
        return config;
    }, {});
};

document.addEventListener('DOMContentLoaded', () => {
    const canvas = <HTMLCanvasElement> document.getElementById('fractal');
    const renderButton = <HTMLButtonElement> document.getElementById('render');
    renderButton.addEventListener('click', (event: Event) => {
        event.preventDefault();
        const config = getConfig();
        const start = Date.now();
        if (typeof SharedArrayBuffer === 'undefined') {
            render(canvas, config).then(() => {
                const duration = Date.now() - start;
                // tslint:disable:no-console
                console.log('Rendering took ' + duration + 'ms.');
                // tslint:enable:no-console
            });
        } else {
            renderShared(canvas, config).then(() => {
                const duration = Date.now() - start;
                // tslint:disable:no-console
                console.log('SAB Rendering took ' + duration + 'ms.');
                // tslint:enable:no-console
            });
        }
    });
});
