import { Mandelbrot, IConfig } from 'Fractal/Mandelbrot';
import { NumberRange } from 'Fractal/NumberRange';
import { Point } from 'Fractal/Point';
import { Rectangle } from 'Fractal/Rectangle';

const getConfig = (rectangle: Rectangle): IConfig => {
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
    return config;
};

const canvas = <HTMLCanvasElement> document.getElementById('fractal');
const mandelbrot = new Mandelbrot(canvas);

let start = new Point();
let end = new Point();

const realRange = new NumberRange(-2.5, 1.0);
const imaginaryRange = new NumberRange(-1.0, 1.0);

canvas.addEventListener('mousedown', (event) => {
    const elementWidthRange = new NumberRange(0, canvas.clientWidth);
    const elementHeightRange = new NumberRange(0, canvas.clientHeight);

    const canvasWidthRange = new NumberRange(0, canvas.width);
    const canvasHeightRange = new NumberRange(0, canvas.height);

    start = new Point(
        NumberRange.Scale(canvasWidthRange, NumberRange.Scale(elementWidthRange, event.clientX, canvasWidthRange), realRange),
        NumberRange.Scale(canvasHeightRange, NumberRange.Scale(elementHeightRange, canvas.clientHeight - event.clientY, canvasHeightRange), imaginaryRange)
    );
});

canvas.addEventListener('mouseup', (event) => {
    const elementWidthRange = new NumberRange(0, canvas.clientWidth);
    const elementHeightRange = new NumberRange(0, canvas.clientHeight);

    const canvasWidthRange = new NumberRange(0, canvas.width);
    const canvasHeightRange = new NumberRange(0, canvas.height);

    end = new Point(
        NumberRange.Scale(canvasWidthRange, NumberRange.Scale(elementWidthRange, event.clientX, canvasWidthRange), realRange),
        NumberRange.Scale(canvasHeightRange, NumberRange.Scale(elementHeightRange, canvas.clientHeight - event.clientY, canvasHeightRange), imaginaryRange)
    );

    const rectangle = new Rectangle(start, end);
});

const renderButton = <HTMLButtonElement> document.getElementById('render');
renderButton.addEventListener('click', (event: Event) => {
    event.preventDefault();
    const config = getConfig(new Rectangle(new Point(-2.5, -1.0), new Point(1.0, 1.0)));
    const start = Date.now();
    mandelbrot.render(config).then(() => {
        const duration = Date.now() - start;
        console.log('Rendering took ' + duration + 'ms.');
    });
});
