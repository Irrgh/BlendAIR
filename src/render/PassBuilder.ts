import { BufferHandle, SamplerHandle, TextureHandle } from "./ResourseHandle";

export class PassBuilder<T> {


    private bindgroupLayouts: Map<number,GPUBindGroupLayoutDescriptor>;
    private bindingMap: Map<string, BindingInfo>;
    protected accessMap: Map<string, ResourceAccess>;
    protected passData: T;

    public readonly name: string;

    constructor(name: string, passData:T) {

        this.bindgroupLayouts = new Map;
        this.bindingMap = new Map();
        this.accessMap = new Map();
        this.passData = passData;
        this.name = name;
    }


    /**
     * Registers a {@link GPUBuffer} to be bound in the pipeline.
     * @param name name of the buffer inside the {@link RenderGraph}.
     * @param group {@link GPUBindGroup} to bind the buffer in.
     * @param binding slot to bind int the {@link GPUBindGroup}
     * @param visiblity visibility in different parts of the shader pipeline
     * @param type type of buffer
     */
    public bindBuffer(name: RenderGraphBufferHandle, group: GPUIndex32, binding: number, visiblity: GPUShaderStageFlags, type: GPUBufferBindingType) : BufferHandle {

        const entry: GPUBindGroupLayoutEntry = {
            binding: binding,
            visibility: visiblity,
            buffer: { type: type }
        }

        if (this.bindgroupLayouts.has(group)) {
            this.bindgroupLayouts.set(group,{entries: new Array()});
        }

        const groupLayout = this.bindgroupLayouts.get(group)!;
        (groupLayout.entries as Array<GPUBindGroupLayoutEntry>).push(entry);

        this.bindingMap.set(name, { group, binding, type: "texture" });

        switch (type) {
            case "uniform": this.accessMap.set(name, "read-only");
            case "read-only-storage": this.accessMap.set(name, "read-only");
            case "storage": this.accessMap.set(name, "read-write");
        }
        return new BufferHandle(name);
    }

    /**
     * Registers a {@link GPUTexture} to be bound in the pipeline.
     * @param name name of the texture inside the {@link RenderGraph}.
     * @param info declares how the texture should be bound.
     */
    public bindTexture(name: RenderGraphTextureHandle, group: GPUIndex32, binding: number, visibility: GPUShaderStageFlags, textureLayout: TextureBindingLayout) : TextureHandle {
        
        if (textureLayout.texture && !textureLayout.storageTexture && !textureLayout.externalTexture) {
            this.accessMap.set(name, "read-only");
        } else if (!textureLayout.texture && textureLayout.storageTexture && !textureLayout.externalTexture) {
            this.accessMap.set(name, textureLayout.storageTexture.access || "write-only");
        } else if (textureLayout.texture && !textureLayout.storageTexture && !textureLayout.externalTexture) {
            this.accessMap.set(name, "read-only");
        } else {
            throw new Error(`Texture binding error: [${name}] has either 0 or more than one textureLayout`);
        }
         
        const entry: GPUBindGroupLayoutEntry = {
            binding: binding,
            visibility: visibility,
            texture: textureLayout.texture,
            storageTexture: textureLayout.storageTexture,
            externalTexture: textureLayout.externalTexture
        }

        if (this.bindgroupLayouts.has(group)) {
            this.bindgroupLayouts.set(group,{entries: new Array()});
        }

        const groupLayout = this.bindgroupLayouts.get(group)!;
        (groupLayout.entries as Array<GPUBindGroupLayoutEntry>).push(entry);
        this.bindingMap.set(name, { group, binding, type: "texture" });
        return new TextureHandle(name);
    }

    /**
     * Registers a {@link GPUSampler} to be bound in the pipeline.
     * @param name name of the sampler inside the {@link RenderGraph}
     * @param group {@link GPUBindGroup} to bind the buffer in.
     * @param binding slot to bind int the {@link GPUBindGroup}
     * @param visibility visibility in different parts of the shader pipeline
     * @param type type of sampler
     */
    public bindSampler(name: RenderGraphSamplerHandle, group: GPUIndex32, binding: number, visibility: GPUShaderStageFlags, type?:GPUSamplerBindingType) : SamplerHandle {
        
        const entry: GPUBindGroupLayoutEntry = {
            binding: binding,
            visibility: visibility,
            sampler : {type}
        }
        
        if (this.bindgroupLayouts.has(group)) {
            this.bindgroupLayouts.set(group,{entries: new Array()});
        }

        const groupLayout = this.bindgroupLayouts.get(group)!;
        (groupLayout.entries as Array<GPUBindGroupLayoutEntry>).push(entry);
        this.bindingMap.set(name, { group, binding, type: "sampler" });

        this.accessMap.set(name,"read-only");
        return new SamplerHandle(name);
    }

    public useBuffer(name: RenderGraphBufferHandle, access: ResourceAccess) {
        this.accessMap.set(name,access);
    }

    public getBindingLayouts() : Map<number,GPUBindGroupLayoutDescriptor> {
        return this.bindgroupLayouts;
    }

    public getBindingMap(): Map<string,BindingInfo> {
        return this.bindingMap;
    }

    public getAccessMap(): Map<string,ResourceAccess> {
        return this.accessMap;
    }

    public getPassData() : T {
        return this.passData;
    }

}