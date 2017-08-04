import { Scheduler } from 'Fractal/Scheduler';

if (typeof SharedArrayBuffer !== 'undefined') {
    const numbers = 20000000;
    const buffer = new SharedArrayBuffer(numbers * 4);
    const buffer_view = new Uint32Array(buffer);

    for (let i = 0; i < numbers; ++i) {
        buffer_view[i] = i;
    }

    let sum = 0;
    console.time('Single-Threaded');
    for (const number of buffer_view) {
        sum += number;
    }
    console.log('Single-Threaded: ' + sum);
    console.timeEnd('Single-Threaded');

    const testTask = (buffer_view: Uint32Array) => {
        let sum = 0;
        for (const number of buffer_view) {
            sum += number;
        }
        return sum;
    };

    const scheduler = new Scheduler(testTask);

    const slice = Math.floor(numbers / navigator.hardwareConcurrency);
    const promises: Array<Promise<number>> = [];
    console.time('Multi-Threaded');
    for (let i = 0; i < navigator.hardwareConcurrency; ++i) {
        const length = i === navigator.hardwareConcurrency - 1 ? slice + numbers % navigator.hardwareConcurrency : slice;
        const slice_view = new Uint32Array(buffer, i * slice * 4, slice);
        promises.push(scheduler.apply([slice_view]));
    }
    Promise.all(promises).then((results) => {
        console.dir(results);
        let sum = 0;
        for (const result of results) {
            sum += result;
        }
        console.log('Multi-Threaded: ' + sum);
        console.timeEnd('Multi-Threaded');
    });
}
