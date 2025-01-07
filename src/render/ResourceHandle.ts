import { FutureValue } from "../util/FutureValue";

export class ResourceHandle<T extends GPUResource> extends FutureValue<T> {
    public readonly name: string;
    constructor(name: string) {
        super();
        this.name = name
    }
}

/**
 * Represents a {@link GPUBuffer} that will be resolved in the future.
 */
export class BufferHandle extends ResourceHandle<GPUBuffer> {
    public readonly desc: GPUBufferDescriptor;
    /** 
     * Defines a cpu side source of data for the buffer to be initialized from.
     * This will be called after the buffer is resolved in the {@link RenderGraph}.
     * 
     * Features like caching are up to the implementation.
     * 
     * **TODO**: 
     * If ArrayBuffer returned is bigger than buffer.size:
     * Either truncate the ArrayBuffer or resize the.
     */
    public readonly source?: () => ArrayBuffer;

    constructor(name: string, desc: GPUBufferDescriptor, source?: () => ArrayBuffer)
    constructor(name: string, buffer: GPUBuffer, source?: () => ArrayBuffer)

    constructor(name: string, arg: GPUBufferDescriptor | GPUBuffer, source?: () => ArrayBuffer) {
        super(name);
        if (arg instanceof GPUBuffer) {
            this.desc = { size: arg.size, usage: arg.usage };
            this.setResolveValue(arg);
        } else {
            this.desc = arg
        }
        this.source = source;
    }

    /**
     * Destroys the underlying {@link GPUBuffer} and resets `resolve()`.
     * Buffer source is **not** reset by this.
     */
    public reset() {
        this.value?.destroy();
        super.reset();
    }

    public useIndirect(): void {
        this.desc.usage |= GPUBufferUsage.INDIRECT;
    }

    public useVertex(): void {
        this.desc.usage |= GPUBufferUsage.VERTEX
    }

    public useIndex(): void {
        this.desc.usage |= GPUBufferUsage.INDEX;
    }

    public useUniform(): void {
        this.desc.usage |= GPUBufferUsage.UNIFORM;
    }

    public useStorage(): void {
        this.desc.usage |= GPUBufferUsage.STORAGE;
    }

}

/**
 * Represents a {@link GPUTexture} that will be resolved in the future.
 */
export class TextureHandle extends ResourceHandle<GPUTexture> {
    public readonly desc: GPUTextureDescriptor;
    /** 
     * Defines a cpu side source of data for the texture to be initialized from.
     * This will be called after the buffer is resolved in the {@link RenderGraph}.
     * Features like caching are up to the implementation.
     * 
     * **TODO**: 
     * If ArrayBuffer returned is bigger than buffer.size:
     * Either truncate the ArrayBuffer or resize the.
     */
    public readonly source?: () => ArrayBuffer;

    constructor(name: string, desc: GPUTextureDescriptor, source?: () => ArrayBuffer)
    constructor(name: string, buffer: GPUTexture, source?: () => ArrayBuffer)


    constructor(name: string, arg: GPUTextureDescriptor | GPUTexture, source?: () => ArrayBuffer) {
        super(name);
        if (arg instanceof GPUTexture) {
            this.desc = {
                size: { width: arg.width, height: arg.height, depthOrArrayLayers: arg.depthOrArrayLayers },
                format: arg.format,
                usage: arg.usage,
                mipLevelCount: arg.mipLevelCount,
                sampleCount: arg.sampleCount,
                dimension: arg.dimension,
            }
            this.setResolveValue(arg)
        } else {
            this.desc = arg
        }
        this.source = source;
    }

    /**
     * Destroys the underlying {@link GPUTexture} and resets `resolve()`.
     * Texture source is **not** reset by this.
     */
    public reset() {
        this.value?.destroy();
        this.reset();
    }

    public useTextureBinding(): void {
        this.desc.usage |= GPUTextureUsage.TEXTURE_BINDING;
    }

    public useStorageBinding(): void {
        this.desc.usage |= GPUTextureUsage.STORAGE_BINDING;
    }

    public useRenderAttachment(): void {
        this.desc.usage |= GPUTextureUsage.RENDER_ATTACHMENT;
    }

}

/**
 * Represents a {@link GPUSampler} that will be resolved in the future.
 */
export class SamplerHandle extends ResourceHandle<GPUSampler> {
    public readonly desc: GPUSamplerDescriptor;

    constructor(name: string, desc: GPUSamplerDescriptor) {
        super(name);
        this.desc = desc;
    }
}

