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

export interface IModuleMap {
    [key: string]: string[];
}

export interface IQueuedTask {
    taskId: number;
    parameters: any[];
    transferables: any[];
}

export class Scheduler<R, T extends (...parameters: any[]) => R | Promise<R> = (...parameters: any[]) => R> {

    private readonly _moduleMap?: IModuleMap;

    private _workerId = 0;
    private _workers: TaskWorker[] = [];

    private _taskId = 0;
    private _tasks: { [key: number]: CallbackContainer } = {};

    private _queue: IQueuedTask[] = [];

    constructor(task: T, moduleMap?: IModuleMap) {
        this._moduleMap = moduleMap;

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
        let task_source = task.toString();
        task_source = task_source.substr(task_source.indexOf('(')).replace(/\{/, '=> {');
        return `
            importScripts('http://localhost:8000/node_modules/systemjs/dist/system.js', 'http://localhost:8000/system.config.js');
            Promise.all(${ JSON.stringify(Object.keys(this._moduleMap ? this._moduleMap : {})) }.map((requirement) => System.import(requirement))).then(imports => { (self => {
                self.onmessage = (event) => {
                    const [taskId, parameters, moduleMap, transferables] = event.data;
                    for(const module in moduleMap) {
                        if(moduleMap.hasOwnProperty(module)) {
                            for(const exported of moduleMap[module]) {
                                for(const imported of imports) {
                                    if(exported in imported) {
                                        self[exported] = imported[exported];
                                    }
                                }
                            }
                        }
                    }
                    try {
                        const returnValue = (${ task_source }).apply(self, parameters);
                        if(returnValue instanceof Promise) {
                            returnValue.then((result) => self.postMessage({taskId, result}, transferables)).catch((error) => self.postMessage({taskId, error}));
                        } else {
                            self.postMessage({taskId, result: returnValue}, transferables);
                        }
                    } catch(error) {
                        self.postMessage({
                            taskId,
                            error
                        });
                    }
                };
            })(self); });
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
                    worker.postMessage([taskId, parameters ? parameters : [], this._moduleMap], transferables ? transferables : []);
                    scheduled = true;
                    break;
                }
            }
            if (!scheduled) {
                this._queue.push({
                    taskId,
                    parameters: parameters ? parameters : [],
                    transferables: transferables ? transferables : []
                });
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
            const queuedTask = this._queue.shift();
            worker.postMessage([
                queuedTask!.taskId,
                queuedTask!.parameters ? queuedTask!.parameters : [],
                this._moduleMap
            ], queuedTask!.transferables ? queuedTask!.transferables : []);
        } else {
            worker.working = false;
        }
    }

}