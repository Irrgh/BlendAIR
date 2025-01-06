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

    constructor (name:string,desc:GPUBufferDescriptor)
    constructor (name:string, buffer:GPUBuffer)

    constructor (name:string, arg: GPUBufferDescriptor | GPUBuffer) {
        super(name);
        if (arg instanceof GPUBuffer) {
            this.desc = {size:arg.size,usage:arg.usage};
            this.setResolveValue(arg);
        } else {
            this.desc = arg
        }
    }

    public reset () { 
        this.value?.destroy();
        super.reset();
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

    constructor (name:string,desc:GPUTextureDescriptor)
    constructor (name:string,buffer:GPUTexture)


    constructor (name:string,arg:GPUTextureDescriptor | GPUTexture) {
        super(name);
        if (arg instanceof GPUTexture) {
            this.desc = {
                size : {width:arg.width,height:arg.height,depthOrArrayLayers:arg.depthOrArrayLayers},
                format : arg.format,
                usage : arg.usage,
                mipLevelCount : arg.mipLevelCount,
                sampleCount:arg.sampleCount,
                dimension:arg.dimension,
            }
            this.setResolveValue(arg);

        } else {
            this.desc = arg
        }
    }

    public reset () {
        this.value?.destroy();
        this.reset();
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

