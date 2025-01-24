import { bundleCode } from './WebBundle';

type WorkerModule<T> = {
    [K in keyof T]: T[K] extends { prototype: any } // Check if class
    ? {
        [P in keyof T[K]]: T[K][P] extends (...args: infer A) => infer R
        ? Asyncify<T[K][P]> // Wrap static methods in Asyncify
        : Asyncify<T[K][P]>; // Keep static properties as-is
    }
    : Asyncify<T[K]>; // Keep everything else
} & {
    /**
     * Terminates the associated Worker and revokes the URLs of the bundled code.
     * @returns 
     */
    terminate: () => Promise<void>;
    /**
     * Indicated whether the module is terminated.
     */
    running: boolean;
};


type Asyncify<T> = T extends (...args: infer A) => infer R
    ? (...args: A) => R extends Promise<any> ? R : Promise<R>
    : T extends Promise<any>
    ? T
    : Promise<T>;






const isArrowFunction = <A extends any[], R>(func: (...args: A) => R) => typeof func === 'function' && !func.hasOwnProperty('prototype');

const isClass = <A extends any[], R>(func: (...args: A) => R) => {
    // Must be a function
    if (typeof func !== "function") {
        return false;
    }

    // Check if the prototype exists and has a constructor pointing to the function
    if (!func.prototype || func.prototype.constructor !== func) {
        return false;
    }

    return true;
}

function isAbsolute(path: string) {
    return path.startsWith('/') && !path.includes('./') && !path.includes('../');
}



type PropertyMethod = "call" | "get"



function createResolvePaths(module: any): Map<string, PropertyMethod> {

    const map: Map<string, PropertyMethod> = new Map();
    Object.entries(module).forEach((el: any) => {
        const [key, value] = el;

        if (typeof value === 'function' && value.prototype && value.prototype.constructor === value) {
            // It's a class: list static properties and methods

            Object.getOwnPropertyNames(value).forEach((classKey) => {
                if (classKey !== 'prototype' && classKey !== 'length' && classKey !== 'name') {
                    switch (typeof value[classKey]) {
                        case "function": map.set(`${key}.${classKey}`, "call"); break;
                        case "undefined": console.warn(`${classKey} is a property of ${value} but is undefined?`); break;
                        default: map.set(`${key}.${classKey}`, "get");
                    }
                }
            });

        } else if (typeof value === 'function') {
            map.set(key, "call");
        } else if (typeof value !== "undefined") {
            map.set(key, "get");
        }
    });

    return map;
}





/**
 * Runs a function on a Worker.
 * The function needs to be `self contained`, meaning no required imports that are within the function scope.
 * @param func function to run concurrently.
 * @returns a {@link R} 
 */
export const createConcurrent = <A extends any[], R>(
    func: (...args: A) => R
): (...args: A) => Promise<R> => {
    const funcString = `
        onmessage = function(event) {
            const func = (${isArrowFunction(func) ? "function" : ""} ${func.toString()});
            const args = event.data;
            const result = func(...args);
            postMessage(result);
        };
    `;

    const blob = new Blob([funcString], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    return (...args: A): Promise<R> => {
        return new Promise<R>((resolve, reject) => {
            worker.onmessage = (event) => {
                resolve(event.data);
            };
            worker.onerror = (error) => {
                reject(error);
            };
            worker.postMessage(args);
        });
    };
}


/**
 * Create a concurrent version of the module running on a Worker.
 * @param module module definition obtained via a qualified/dynamic import
 * @param filePath absolute path of the file in the project.
 * @returns  a {@link WorkerModule}
 */
export const createConcurrentModule = async <M extends any, R>(
    module: M, filePath: string
): Promise<WorkerModule<M>> => {

    if (!isAbsolute(filePath)) {
        throw new Error(`${filePath} is not an absolute path.`);
    }

    const bundle = await bundleCode(filePath);

    const bundleBlob = new Blob([bundle], { type: 'application/javascript' });
    const bundleURL = URL.createObjectURL(bundleBlob);

    const workerCode = `
        import('${bundleURL}').then((module) => {
            // Attach all module exports to self
            Object.entries(module).forEach(([key, value]) => {
                self[key] = value;
            });

            postMessage({msg:"Worker init successful"});

            onmessage = async (event) => {
                const { id, type, prop, args } = event.data;
                try {
                    console.log('Worker received:', { type, prop, args });
                    const target = prop.split('.').reduce((acc, part) => acc[part], self);
                    if (type === 'get') {
                        postMessage({ id, result: target });
                    } else if (type === 'call') {
                        const result = await target(...args);
                        postMessage({ id, result });
                    } else {
                        throw new Error('Unknown message type: ' + type);
                    }
                } catch (error) {
                    postMessage({ id, error: error.message });
                }
            };
        }).catch((error) => {
            console.error('Failed to load module in worker:', error);
        });
    `;

    const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
    const workerURL = URL.createObjectURL(workerBlob);

    const worker = await new Promise<Worker>((resolve, reject) => {
        const worker = new Worker(workerURL, { type: "module" });

        const init = (event: MessageEvent) => {
            worker.removeEventListener("message", init);
            if (event.data.error) {
                reject(new Error(event.data.error));
            } else {
                resolve(worker);
            }
        }

        worker.addEventListener("message", init)
    });

    

    const terminate = async (handler:ProxyHandler<any>) => {   
        worker.terminate();
        URL.revokeObjectURL(bundleURL);
        URL.revokeObjectURL(workerURL);
        handler.apply = () => {throw new Error(`Concurrent module has been terminated`)};
        handler.get = (target: any, prop: string) => {
            if (prop === "running") {
                return false;
            }
            throw new Error(`Concurrent module has been terminated`);
        };
    }

    const resolvePaths = createResolvePaths(module);

    const messageHandler = (): Promise<any> =>
        new Promise((resolve, reject) => {
            const onMessage = (event: MessageEvent) => {
                worker.removeEventListener("message", onMessage);

                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve(event.data.result);
                }

            };

            // Ensure the listener is added before `postMessage` is called
            worker.addEventListener("message", onMessage);
        });

    const handler: ProxyHandler<any> = {

        apply(target: any, thisArg: any, argumentsList: any[]) {

            const prop = target();

            if (prop === "terminate") {
                return terminate(handler);
            }

            const type = resolvePaths.get(prop);
            if (!type) {
                throw new Error(`[${prop}] is not defined in the worker module.`);
            }

            if (type != "call") {
                throw new Error(`[${prop}] is not a function, but a property.`);
            }

            const id = window.crypto.randomUUID()
            const responsePromise = messageHandler();
            worker.postMessage({ id, prop, type: "call", args: argumentsList });
            return responsePromise;
        },

        get(target: any, prop: string) {

            if (prop === "then") {
                return undefined;
            }

            if (prop === "running") {
                return true;
            }

            const path = target() ? `${target()}.${prop}` : `${prop}`;
            const newTarget = () => path;
            const type = resolvePaths.get(path);

            if (type === "get") {
                const id = window.crypto.randomUUID()
                const responsePromise = messageHandler();
                worker.postMessage({ id, prop: path, type: "get" });
                return responsePromise;
            }

            // New Proxy for nested properties
            return new Proxy(newTarget, handler);
        }
    }

    return new Proxy(() => {}, handler);

}



