
/**
 * Represents a value that is not known yet but can be resolved after setting it in the future.
 */
export class FutureValue<T> {
    private promise: Promise<T>;
    private _resolve!: (value: T) => void;
    private resolved: boolean = false;

    constructor() {
        // Create a deferred Promise
        this.promise = new Promise<T>((resolve) => {
            this._resolve = resolve; // Capture the resolve function
        });
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
        this._resolve(value); // Resolve the Promise
    }

    /**
     * Returns a Promise that is pending until the resolve value is set.
     * @returns a `Promise<T>`
     */
    public resolve(): Promise<T> {
        return this.promise;
    }
}