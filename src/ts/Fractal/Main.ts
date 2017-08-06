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

const selection = <HTMLCanvasElement> document.getElementById('selection');
const selectionContext = selection.getContext('2d');
if (!selectionContext) {
    throw new Error('Unable to create context');
}

const canvas = <HTMLCanvasElement> document.getElementById('fractal');
const mandelbrot = new Mandelbrot(canvas);

let start: Point | undefined;
let complexStart: Point | undefined;

let rectangle = new Rectangle(new Point(-2.5, -1.0), new Point(1.0, 1.0));

let realRange = new NumberRange(-2.5, 1.0);
let imaginaryRange = new NumberRange(-1.0, 1.0);

const render = (rectangle: Rectangle) => {
    const config = getConfig(rectangle);
    const startTime = Date.now();
    mandelbrot.render(config).then(() => {
        const duration = Date.now() - startTime;
        console.log('Rendering took ' + duration + 'ms.');
    });
};

selection.addEventListener('mousedown', (event: MouseEvent) => {
    const elementWidthRange = new NumberRange(0, canvas.clientWidth);
    const elementHeightRange = new NumberRange(0, canvas.clientHeight);

    const canvasWidthRange = new NumberRange(0, canvas.width);
    const canvasHeightRange = new NumberRange(0, canvas.height);

    start = new Point(
        NumberRange.Scale(elementWidthRange, event.clientX, canvasWidthRange),
        NumberRange.Scale(elementHeightRange, event.clientY, canvasHeightRange)
    );

    complexStart = new Point(
        NumberRange.Scale(canvasWidthRange, start.x(), realRange),
        NumberRange.Scale(canvasHeightRange, start.y(), imaginaryRange)
    );
});

selection.addEventListener('mousemove', (event) => {
    if (start) {
        const elementWidthRange = new NumberRange(0, canvas.clientWidth);
        const elementHeightRange = new NumberRange(0, canvas.clientHeight);

        const canvasWidthRange = new NumberRange(0, canvas.width);
        const canvasHeightRange = new NumberRange(0, canvas.height);

        const current = new Point(
            NumberRange.Scale(elementWidthRange, event.clientX, canvasWidthRange),
            NumberRange.Scale(elementHeightRange, event.clientY, canvasHeightRange)
        );

        selectionContext.clearRect(0, 0, selection.width, selection.height);
        selectionContext.strokeStyle = 'red';
        selectionContext.strokeRect(
            start.x(),
            start.y(),
            current.x() - start.x(),
            current.y() - start.y()
        );
    }
});

selection.addEventListener('mouseup', (event) => {
    selectionContext.clearRect(0, 0, selection.width, selection.height);

    const elementWidthRange = new NumberRange(0, canvas.clientWidth);
    const elementHeightRange = new NumberRange(0, canvas.clientHeight);

    const canvasWidthRange = new NumberRange(0, canvas.width);
    const canvasHeightRange = new NumberRange(0, canvas.height);

    rectangle = new Rectangle(complexStart, new Point(
        NumberRange.Scale(canvasWidthRange, NumberRange.Scale(elementWidthRange, event.clientX, canvasWidthRange), realRange),
        NumberRange.Scale(canvasHeightRange, NumberRange.Scale(elementHeightRange, event.clientY, canvasHeightRange), imaginaryRange)
    ));

    render(rectangle);

    realRange = new NumberRange(rectangle.start().x(), rectangle.end().x());
    imaginaryRange = new NumberRange(rectangle.start().y(), rectangle.end().y());

    start = undefined;
    complexStart = undefined;
});

const renderButton = <HTMLButtonElement> document.getElementById('render');
renderButton.addEventListener('click', (event: Event) => {
    event.stopPropagation();
    render(rectangle);
});

const resetButton = <HTMLButtonElement> document.getElementById('reset');
resetButton.addEventListener('click', (event: Event) => {
    event.stopPropagation();

    realRange = new NumberRange(-2.5, 1.0);
    imaginaryRange = new NumberRange(-1.0, 1.0);
    rectangle = new Rectangle(new Point(-2.5, -1.0), new Point(1.0, 1.0));

    render(rectangle);
});
