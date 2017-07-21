const threadCount = 32;

let threads: Worker[] = [];
for (let i = 0; i < threadCount; ++i) {
    threads.push(new Worker('ts/Fractal/Workers/Thread.js'));
}

interface IConfig {
    density: number;
    colors: number;
    iterations: number;
    red: number;
    green: number;
    blue: number;
}

let render = (canvas: HTMLCanvasElement, config: IConfig, callback?: (config: IConfig) => void) => {
    const width = canvas.width = 1920;
    const height = canvas.height = 1080;

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Unable to get context');
    }

    const slice = Math.floor(height / threadCount);
    let done = 0;
    for (let i = 0; i < threadCount; ++i) {
        const start = i * slice;
        const onMessage = (event: MessageEvent) => {
            const data = new Uint8ClampedArray(event.data);
            context!.putImageData(new ImageData(data, width, slice), 0, start);
            if (++done === threadCount && callback) {
                callback(config);
            }
            threads[i].removeEventListener('message', onMessage);
        };
        threads[i].addEventListener('message', onMessage);
        threads[i].postMessage(<IThreadConfig> {
            width,
            height,
            start,
            end: start + slice,
            density: config.density,
            colors: config.colors,
            iterations: config.iterations,
            red: config.red,
            green: config.green,
            blue: config.blue
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const $ = <T extends Element>(selector: string): T => {
        return <T> document.querySelector(selector);
    };

    const getConfig = () => {
        const density = parseInt((<HTMLInputElement> $('#density')).value, 10);
        const colors = parseInt((<HTMLInputElement> $('#colors')).value, 10);
        const iterations = parseInt((<HTMLInputElement> $('#iterations')).value, 10);
        const red = parseFloat((<HTMLInputElement> $('#red')).value);
        const green = parseFloat((<HTMLInputElement> $('#green')).value);
        const blue = parseFloat((<HTMLInputElement> $('#blue')).value);
        return {
            density,
            colors,
            iterations,
            red,
            green,
            blue
        };
    };

    const canvas = <HTMLCanvasElement> $('#fractal');
    $('#render').addEventListener('click', (event: Event) => {
        event.preventDefault();
        const start = Date.now();
        render(canvas, getConfig(), () => {
            const duration = Date.now() - start;
            // tslint:disable:no-console
            console.log('Rendering took ' + duration + 'ms.');
            // tslint:enable:no-console
        });
    });
});
