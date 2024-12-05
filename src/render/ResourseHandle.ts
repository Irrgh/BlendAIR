import { FutureValue } from "../util/FutureValue";

type GPUResource = GPUBuffer | GPUTexture | GPUSampler

export class ResourceHandle<T extends GPUResource> extends FutureValue<T> {
    public readonly name : string;
    constructor (name: string) {
        super();
        this.name = name
    }
}

/**
 * Represents a {@link GPUBuffer} that will be resolved in the future.
 */
export class BufferHandle extends ResourceHandle<GPUBuffer> {}

/**
 * Represents a {@link GPUTexture} that will be resolved in the future.
 */
export class TextureHandle extends ResourceHandle<GPUTexture> {}

/**
 * Represents a {@link GPUSampler} that will be resolved in the future.
 */
export class SamplerHandle extends ResourceHandle<GPUSampler> {}

