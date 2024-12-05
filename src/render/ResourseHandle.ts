class ResourceHandle<T> {
    public readonly name: string;
    private promise: Promise<T>;
    private _resolve!: (value: T) => void;

    constructor(name: string) {
        this.name = name;

        // Create a deferred Promise
        this.promise = new Promise<T>((resolve) => {
            this._resolve = resolve; // Capture the resolve function
        });
    }

    // Assign the resolve value later
    setResolveValue(value: T): void {
        this._resolve(value); // Resolve the Promise
    }

    // Wait for the resolve value
    resolve(): Promise<T> {
        return this.promise;
    }
}

export class BufferHandle extends ResourceHandle<GPUBuffer> {}
export class TextureHandle extends ResourceHandle<GPUTexture> {}
export class SamplerHandle extends ResourceHandle<GPUSampler> {}


