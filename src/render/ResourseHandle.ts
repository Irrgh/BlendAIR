import { FutureValue } from "../util/FutureValue";


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
export class BufferHandle extends ResourceHandle<GPUBuffer> {
    public readonly desc: GPUBufferDescriptor;

    constructor (name:string,desc:GPUBufferDescriptor) {
        super(name);
        this.desc = desc;
    }
    
    public useIndirect():void {
        this.desc.usage |= GPUBufferUsage.INDIRECT;
    }

    public useVertex():void {
        this.desc.usage |= GPUBufferUsage.VERTEX
    }

    public useIndex():void {
        this.desc.usage |= GPUBufferUsage.INDEX;
    }

    public useUniform():void {
        this.desc.usage |= GPUBufferUsage.UNIFORM;
    }

    public useStorage():void {
        this.desc.usage |= GPUBufferUsage.STORAGE;
    }

}

/**
 * Represents a {@link GPUTexture} that will be resolved in the future.
 */
export class TextureHandle extends ResourceHandle<GPUTexture> {
    public readonly desc: GPUTextureDescriptor;

    constructor (name:string,desc:GPUTextureDescriptor) {
        super(name);
        this.desc = desc;
    }

    public useTextureBinding():void {
        this.desc.usage |= GPUTextureUsage.TEXTURE_BINDING;
    }
    
    public useStorageBinding():void {
        this.desc.usage |= GPUTextureUsage.STORAGE_BINDING;
    }
    
    public useRenderAttachment():void {
        this.desc.usage |= GPUTextureUsage.RENDER_ATTACHMENT;
    }

}

/**
 * Represents a {@link GPUSampler} that will be resolved in the future.
 */
export class SamplerHandle extends ResourceHandle<GPUSampler> {
    public readonly desc: GPUSamplerDescriptor;

    constructor (name:string,desc:GPUSamplerDescriptor) {
        super(name);
        this.desc = desc;
        
    }
}

