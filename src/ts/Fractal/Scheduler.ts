type ResolveType<T> = (value?: T | PromiseLike<T>) => void;
type RejectType = (reason?: any) => void;
class CallbackContainer<T> {

    public readonly resolve: ResolveType<T>;
    public readonly reject: RejectType;

    constructor(resolve: ResolveType<T>, reject: RejectType) {
        this.resolve = resolve;
        this.reject = reject;
    }

}

class TaskWorker extends Worker {
    public working: boolean = false;
}

export interface IModuleMap {
    [key: string]: string[];
}

export interface IQueuedTask {
    taskId: number;
    parameters: any[];
    transferables: any[];
}

export interface ITaskResult<R = any> {
    result: R;
    transferables: any[];
}

export class Scheduler<T extends (...parameters: any[]) => ITaskResult | Promise<ITaskResult>> {

    private readonly _moduleMap?: IModuleMap;

    private _workerId = 0;
    private _workers: TaskWorker[] = [];

    private _taskId = 0;
    private _tasks: { [key: number]: CallbackContainer<any> } = {};

    private _queue: IQueuedTask[] = [];

    constructor(task: T, moduleMap?: IModuleMap) {
        this._moduleMap = moduleMap;

        const taskSource = URL.createObjectURL(new Blob([this.getRunner(task)], {
            type: 'text/javascript'
        }));

        for (let i = 0; i < navigator.hardwareConcurrency; ++i) {
            const worker = new TaskWorker(taskSource);
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
                    const [taskId, parameters, moduleMap] = event.data;
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
                            returnValue.then(promiseReturnValue => {
                                const { result, transferables } = promiseReturnValue;
                                self.postMessage({ taskId, result }, transferables);
                            }).catch(error => {
                                console.error(error);
                                self.postMessage({
                                    taskId,
                                    error: JSON.stringify(error)
                                });
                            });
                        } else {
                            const { result, transferables } = returnValue;
                            self.postMessage({ taskId, result }, transferables);
                        }
                    } catch(error) {
                        console.error(error);
                        self.postMessage({
                            taskId,
                            error: JSON.stringify(error)
                        });
                    }
                };
            })(self); });
        `;
    }

    private schedule(parameters?: any[], transferables?: any[]): Promise<any> {
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
