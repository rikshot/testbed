class CallbackContainer {

    public resolve: any;
    public reject: any;

    constructor(resolve: any, reject: any) {
        this.resolve = resolve;
        this.reject = reject;
    }

}

class TaskWorker extends Worker {
    public working: boolean;
}

class Scheduler<T extends Function> {

    private _workerId = 0;
    private _workers: TaskWorker[] = [];

    private _taskId = 0;
    private _tasks: { [key: number]: CallbackContainer } = {};

    private _queue: Array<[number, any[], any[]]> = [];

    constructor(task: T) {
        const task_source = URL.createObjectURL(new Blob([this.getRunner(task)], {
            type: 'text/javascript'
        }));

        for (let i = 0; i < navigator.hardwareConcurrency; ++i) {
            const worker = new TaskWorker(task_source);
            worker.working = false;
            worker.addEventListener('message', (event: MessageEvent) => this.onMessage(event));
            this._workers.push(worker);
        }
    }

    public apply(parameters?: any[], transferables?: any[]): Promise<any> {
        return this.schedule(parameters, transferables);
    }

    private getRunner(task: T) {
        return `
            ((self) => {
                self.onmessage = (event) => {
                    const [taskId, parameters] = event.data;
                    try {
                        const returnValue = (${task.toString()}).apply(self, parameters);
                        if(returnValue instanceof Promise) {
                            returnValue.then((result) => self.postMessage({taskId, result})).catch((error) => self.postMessage({taskId, error}));
                        } else {
                            self.postMessage({taskId, result: returnValue});
                        }
                    } catch(error) {
                        self.postMessage({
                            taskId,
                            error
                        });
                    }
                };
            })(self);
        `;
    }

    private schedule(parameters?: any[], transferables?: any[]): Promise<T> {
        const taskId = this._taskId++;
        return new Promise((resolve, reject) => {
            const task = this._tasks[taskId] = new CallbackContainer(resolve, reject);

            let scheduled = false;
            for (const worker of this._workers) {
                if (!worker.working) {
                    worker.working = true;
                    worker.postMessage([taskId, parameters ? parameters : []], transferables);
                    scheduled = true;
                    break;
                }
            }
            if (!scheduled) {
                this._queue.push([taskId, parameters ? parameters : [], transferables ? transferables : []]);
            }
        });
    }

    private onMessage(event: MessageEvent) {
        const data = event.data;

        const task = this._tasks[data.taskId];
        if ('result' in data) {
            task.resolve(data.result);
        } else if ('error' in data) {
            task.reject(data.error);
        } else {
            task.resolve();
        }

        delete this._tasks[data.taskId];

        const worker = <TaskWorker> event.target;
        if (this._queue.length > 0) {
            worker.postMessage(this._queue.shift());
        } else {
            worker.working = false;
        }
    }

}

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
Promise.all(promises).then(results => {
    console.dir(results);
    let sum = 0;
    for (const result of results) {
        sum += result;
    }
    console.log('Multi-Threaded: ' + sum);
    console.timeEnd('Multi-Threaded');
});
