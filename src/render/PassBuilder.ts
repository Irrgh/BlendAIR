
export type ResourceAccess
    = "read-only"
    | "write-only"
    | "read-write"


interface BindingInfo {
    access: ResourceAccess,
    visibility: GPUShaderStageFlags,
    binding: GPUIndex32,
    group: GPUIndex32,
    /**
     * New resource name to set after traversing the pass.
     */
    alias?: string
}


interface BufferBindingInfo extends BindingInfo {
    type: GPUBufferBindingType,
}

interface TextureBindingInfo extends BindingInfo {
    sampleType?: GPUTextureSampleType,
}


export type PassEncoder
    = GPUComputePassEncoder
    | GPURenderPassEncoder





export abstract class PassBuilder {

    private boundBuffers: Map<string, BufferBindingInfo>;
    private boundTextures: Map<string,TextureBindingInfo>;
    private boundSamplers: Map<string, TextureBindingInfo>;

    constructor() {
        this.boundBuffers = new Map();
        this.boundTextures = new Map();
        this.boundSamplers = new Map();
    }


    /**
     * Registers a {@link GPUBuffer} to be bound in the passes pipeline.
     * @param name name of the buffer inside the {@link RenderGraph}.
     * @param info declares how the buffer should be bound.
     */
    public bindBuffer(name: string, info: BufferBindingInfo) {
        const buffer = this.boundBuffers.get(name);
        if (buffer) {
            throw new Error(`Buffer binding declaration error: [${name}] has already been defined with [${buffer}] for this pass.`);
        }

        if (info.access !== "read-write" && info.alias) {
            throw new Error(`Buffer binding declaration error: [${name}] can not have an alias because access is not "read-write".`);
        }

        this.boundBuffers.set(name,info);

    }

    /**
     * Registers a {@link GPUTexture} to be bound in the passes pipeline.
     * @param name name of the texture inside the {@link RenderGraph}.
     * @param info declares how the texture should be bound.
     */
    public bindTexture(name: string, info: TextureBindingInfo) {
        const texture = this.boundBuffers.get(name);
        if (texture) {
            throw new Error(`Texture binding declaration error: [${name}] has already been defined with [${texture}] for this pass.`);
        }

        if (info.access !== "read-write" && info.alias) {
            throw new Error(`Texture binding declaration error: [${name}] can not have an alias because access is not "read-write".`);
        }

        this.boundTextures.set(name,info);
    }

    /**
     * Registers a {@link GPUSampler} to be bound in the passes pipeline.
     * @param name name of the sampler inside the {@link RenderGraph}.
     * @param info declares how the texture should be bound.
     */
    public bindSamplers(name:string, info: BindingInfo) {
        const sampler = this.boundBuffers.get(name);
        if (sampler) {
            throw new Error(`Sampler binding declaration error: [${name}] has already been defined with [${sampler}] for this pass.`);
        }

    
        this.boundSamplers.set(name,info);
    }


    public abstract execute<PassData> (cmd: GPUCommandEncoder, passData:PassData) : void



}