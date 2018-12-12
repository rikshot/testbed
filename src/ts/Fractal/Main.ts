import { RenderMode, Mandelbrot } from 'Fractal/Mandelbrot.js';
import { NumberRange } from 'Fractal/NumberRange.js';
import { Vector } from 'Sandbox/Vector.js';
import { Rectangle } from 'Sandbox/Rectangle.js';
import { Config } from 'Fractal/Config.js';

const getConfig = (rectangle: Rectangle): Config => {
    const config: any = {};
    Object.entries({
        iterations: 'integer',
        red: 'float',
        green: 'float',
        blue: 'float'
    }).forEach(([key, type]) => {
        const rawValue = (<HTMLInputElement> document.getElementById(key)).value;
        config[key] = type === 'integer' ? parseInt(rawValue, 10) : parseFloat(rawValue);
    });
    config.rectangle = rectangle;
    return new Config(config.iterations, config.red, config.green, config.blue, rectangle);
};

const selection = <HTMLCanvasElement> document.getElementById('selection');
const selectionContext = selection.getContext('2d');
if (!selectionContext) {
    throw new Error('Unable to create context');
}

const canvas = <HTMLCanvasElement> document.getElementById('fractal');
const mandelbrot = new Mandelbrot(canvas);

let start: Vector | undefined;
let complexStart: Vector | undefined;

let rectangle = new Rectangle(new Vector(-2.5, -1.0), new Vector(1.0, 1.0));

let realRange = new NumberRange(-2.5, 1.0);
let imaginaryRange = new NumberRange(-1.0, 1.0);

const render = (rectangle: Rectangle) => {
    const modeElement = <HTMLSelectElement> document.getElementById('mode');
    const modeString = modeElement.options[modeElement.selectedIndex].value;

    const config = getConfig(rectangle);
    const startTime = performance.now();
    return mandelbrot.render(RenderMode[modeString.toUpperCase() as keyof typeof RenderMode], config).then(() => {
        const duration = performance.now() - startTime;
        console.log('Rendering took ' + duration + 'ms.');
    });
};

selection.addEventListener('mousedown', (event: MouseEvent) => {
    const elementWidthRange = new NumberRange(0, canvas.clientWidth);
    const elementHeightRange = new NumberRange(0, canvas.clientHeight);

    const canvasWidthRange = new NumberRange(0, canvas.width);
    const canvasHeightRange = new NumberRange(0, canvas.height);

    start = new Vector(
        NumberRange.Scale(elementWidthRange, event.clientX, canvasWidthRange),
        NumberRange.Scale(elementHeightRange, event.clientY, canvasHeightRange)
    );

    complexStart = new Vector(
        NumberRange.Scale(canvasWidthRange, start.x, realRange),
        NumberRange.Scale(canvasHeightRange, start.y, imaginaryRange)
    );
});

selection.addEventListener('mousemove', (event) => {
    if (start) {
        const elementWidthRange = new NumberRange(0, canvas.clientWidth);
        const elementHeightRange = new NumberRange(0, canvas.clientHeight);

        const canvasWidthRange = new NumberRange(0, canvas.width);
        const canvasHeightRange = new NumberRange(0, canvas.height);

        const current = new Vector(
            NumberRange.Scale(elementWidthRange, event.clientX, canvasWidthRange),
            NumberRange.Scale(elementHeightRange, event.clientY, canvasHeightRange)
        );

        selectionContext.clearRect(0, 0, selection.width, selection.height);
        selectionContext.strokeStyle = 'red';
        selectionContext.strokeRect(
            start.x,
            start.y,
            current.x - start.x,
            current.y - start.y
        );
    }
});

selection.addEventListener('mouseup', (event) => {
    selectionContext.clearRect(0, 0, selection.width, selection.height);

    const elementWidthRange = new NumberRange(0, canvas.clientWidth);
    const elementHeightRange = new NumberRange(0, canvas.clientHeight);

    const canvasWidthRange = new NumberRange(0, canvas.width);
    const canvasHeightRange = new NumberRange(0, canvas.height);

    rectangle = new Rectangle(complexStart, new Vector(
        NumberRange.Scale(canvasWidthRange, NumberRange.Scale(elementWidthRange, event.clientX, canvasWidthRange), realRange),
        NumberRange.Scale(canvasHeightRange, NumberRange.Scale(elementHeightRange, event.clientY, canvasHeightRange), imaginaryRange)
    ));

    render(rectangle);

    realRange = new NumberRange(rectangle.start.x, rectangle.end.x);
    imaginaryRange = new NumberRange(rectangle.start.y, rectangle.end.y);

    start = undefined;
    complexStart = undefined;
});

const renderButton = <HTMLButtonElement> document.getElementById('render');
renderButton.addEventListener('click', (event: Event) => {
    event.stopPropagation();
    render(rectangle);
});

const benchmarkButton = <HTMLButtonElement> document.getElementById('benchmark');
benchmarkButton.addEventListener('click', (event: Event) => {
    event.stopPropagation();
    let average = 0;
    const iterate = (n: number): Promise<any> => {
        if (n === 10) {
            return Promise.resolve();
        }
        const start = performance.now();
        return render(rectangle).then(() => {
            average = ((performance.now() - start) + n * average) / (n + 1);
            return iterate(n + 1);
        });
    };
    iterate(0).then(() => console.log('Average: ' + average + 'ms.'));
});

const resetButton = <HTMLButtonElement> document.getElementById('reset');
resetButton.addEventListener('click', (event: Event) => {
    event.stopPropagation();

    realRange = new NumberRange(-2.5, 1.0);
    imaginaryRange = new NumberRange(-1.0, 1.0);
    rectangle = new Rectangle(new Vector(-2.5, -1.0), new Vector(1.0, 1.0));

    render(rectangle);
});
