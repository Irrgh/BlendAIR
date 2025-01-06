
/**
 * Represents a value that is not known yet but can be resolved after setting it in the future.
 */
export class FutureValue<T> {
    private promise: Promise<T>;
    private _resolve!: (value: T) => void;
    private _reject!: (reason?: any) => void;
    private resolved: boolean = false;
    protected value: T | null = null;

    constructor() {
        // Create a deferred Promise
        this.promise = new Promise<T>((resolve,reject) => {
            this._resolve = resolve; // Capture the resolve function
            this._reject = reject;
        });
        // catching error with this.
        this.promise.catch(_ => console.warn(this,`Future value was reset before value could be resolved.`));
    }

    public isResolved():boolean {
        return this.resolved;
    }


    /**
     * Sets the resolved value.
     * @param value {@link T}
     */
    public setResolveValue(value: T): void {
        this.resolved = true;
        this.value = value;
        this._resolve(value); // Resolve the Promise
    }

    /**
     * Returns a Promise that is pending until the resolve value is set.
     * @returns a `Promise<T>`
     */
    public async resolve(): Promise<T> {
        return this.promise;
    }

    public getValue() : T {
        if (!this.resolved) {
            throw new Error(`This value is not resolved yet.`);
        }
        return this.value!;
    }

    /**
     * Resets the state of the {@link FutureValue}.
     */
    public reset():void {
        this.resolved = false;
        this.value = null;
        this._reject();
        this.promise = new Promise<T>((resolve,reject) => {
            this._resolve = resolve; // Capture a new resolve function
            this._reject = reject;
        });
        // catching error with this.
        this.promise.catch(_ => console.warn(this,`Future value was reset before value could be resolved.`));
    }

}