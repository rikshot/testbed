import { Mandelbrot, IConfig } from 'Fractal/Mandelbrot';
import { NumberRange } from 'Fractal/NumberRange';

const getConfig = (): IConfig => {
    return Object.entries({
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

const canvas = <HTMLCanvasElement> document.getElementById('fractal');
const mandelbrot = new Mandelbrot(canvas);

let xStart = 0.0;
let yStart = 0.0;

let xEnd = 0.0;
let yEnd = 0.0;

const realRange = new NumberRange(-2.5, 1.0);
const imaginaryRange = new NumberRange(-1.0, 1.0);

canvas.addEventListener('mousedown', (event) => {
    const elementWidthRange = new NumberRange(0, canvas.clientWidth);
    const elementHeightRange = new NumberRange(0, canvas.clientHeight);

    const canvasWidthRange = new NumberRange(0, canvas.width);
    const canvasHeightRange = new NumberRange(0, canvas.height);

    xStart = NumberRange.Scale(canvasWidthRange, NumberRange.Scale(elementWidthRange, event.clientX, canvasWidthRange), realRange);
    yStart = NumberRange.Scale(canvasHeightRange, NumberRange.Scale(elementHeightRange, canvas.clientHeight - event.clientY, canvasHeightRange), imaginaryRange);
});

canvas.addEventListener('mouseup', (event) => {
    const elementWidthRange = new NumberRange(0, canvas.clientWidth);
    const elementHeightRange = new NumberRange(0, canvas.clientHeight);

    const canvasWidthRange = new NumberRange(0, canvas.width);
    const canvasHeightRange = new NumberRange(0, canvas.height);

    xEnd = NumberRange.Scale(canvasWidthRange, NumberRange.Scale(elementWidthRange, event.clientX, canvasWidthRange), realRange);
    yEnd = NumberRange.Scale(canvasHeightRange, NumberRange.Scale(elementHeightRange, canvas.clientHeight - event.clientY, canvasHeightRange), imaginaryRange);

    console.dir({
        xStart,
        yStart,
        xEnd,
        yEnd
    });
});

const renderButton = <HTMLButtonElement> document.getElementById('render');
renderButton.addEventListener('click', (event: Event) => {
    event.preventDefault();
    const config = getConfig();
    const start = Date.now();
    mandelbrot.render(config).then(() => {
        const duration = Date.now() - start;
        console.log('Rendering took ' + duration + 'ms.');
    });
});
