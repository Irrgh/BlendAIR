import { BufferHandle, ResourceHandle, SamplerHandle, TextureHandle } from './ResourseHandle';

export class PassBuilder<T> {


    protected bindgroupLayouts: Map<number,GPUBindGroupLayoutDescriptor>;
    protected bindingMap: Map<string, BindingInfo>;
    protected accessMap: Map<string, ResourceAccess>;
    protected handleMap: Map<string, ResourceHandle<any>>;
    protected passData: T;

    public readonly name: string;

    constructor(name: string, passData:T) {

        this.bindgroupLayouts = new Map;
        this.bindingMap = new Map();
        this.accessMap = new Map();
        this.handleMap = new Map();
        this.passData = passData;
        this.name = name;
    }


    /**
     * Registers a {@link GPUBuffer} to be bound in the pipeline.
     * @param handle  of the buffer inside the {@link RenderGraph}.
     * @param group {@link GPUBindGroup} to bind the buffer in.
     * @param binding slot to bind int the {@link GPUBindGroup}
     * @param visiblity visibility in different parts of the shader pipeline
     * @param type type of buffer
     * @returns a updated {@link BufferHandle} to the {@link GPUBuffer}.
     */
    public bindBuffer(handle: BufferHandle, group: GPUIndex32, binding: number, visiblity: GPUShaderStageFlags, type: GPUBufferBindingType) : BufferHandle {

        const name = handle.name
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

        const existingHandle = this.handleMap.get(name);
        if (existingHandle) {return existingHandle;}

        this.handleMap.set(name,handle);
        return handle;
    }

    /**
     * Registers a {@link GPUTexture} to be bound in the pipeline.
     * @param handle name of the texture inside the {@link RenderGraph}.
     * @param info declares how the texture should be bound.
     * @returns a updated {@link TextureHandle} to the {@link GPUTexture}.
     */
    public bindTexture(handle: TextureHandle, group: GPUIndex32, binding: number, visibility: GPUShaderStageFlags, textureLayout: TextureBindingLayout) : TextureHandle {

        const name = handle.name;

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

        const existingHandle = this.handleMap.get(name);
        if (existingHandle) {return existingHandle;}

        this.handleMap.set(name,handle);
        return handle;
    }

    /**
     * Registers a {@link GPUSampler} to be bound in the pipeline.
     * @param handle handle of the sampler inside the {@link RenderGraph}
     * @param group {@link GPUBindGroup} to bind the buffer in.
     * @param binding slot to bind int the {@link GPUBindGroup}
     * @param visibility visibility in different parts of the shader pipeline
     * @param type type of sampler
     * @returns a updated {@link SamplerHandle} to the {@link GPUTexture}.
     */
    public bindSampler(handle: SamplerHandle, group: GPUIndex32, binding: number, visibility: GPUShaderStageFlags, type?:GPUSamplerBindingType) : SamplerHandle {
        
        const name = handle.name;

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
        
        const existingHandle = this.handleMap.get(name);
        if (existingHandle) {return existingHandle;}

        this.handleMap.set(name,handle);
        return handle;
    }

    /**
     * Registers a {@link GPUBuffer} to be used in this pass without being bound.
     * @param handle handle of the buffer inside the {@link RenderGraph}
     * @param access resource access of the buffer in this pass.
     * @returns a updated {@link BufferHandle} to the {@link GPUBuffer}.
     */
    public useBuffer(handle: BufferHandle, access: ResourceAccess) : BufferHandle {
        this.accessMap.set(handle.name,access);
        
        const existingHandle = this.handleMap.get(handle.name);
        if (existingHandle) {return existingHandle;}
        this.handleMap.set(handle.name,handle);
        return handle;
    }

    /**
     * Returns the bindgroup layout of this pass.
     * @returns a Map of bindgroup layouts.
     */
    public getBindingLayouts() : Map<number,GPUBindGroupLayoutDescriptor> {
        return this.bindgroupLayouts;
    }

    /**
     * Returns the binding information of the resources used. 
     * @returns a Map of {@link BindingInfo}.
     */
    public getBindingMap(): Map<string,BindingInfo> {
        return this.bindingMap;
    }

    /**
     * Returns the resource access of the resources used.
     * @returns a Map of {@link ResourceAccess}
     */
    public getAccessMap(): Map<string,ResourceAccess> {
        return this.accessMap;
    }

    /**
     * Returns the handles of the resources used.
     * @returns a Map of {@link ResourceHandle}
     */
    public getHandleMap(): Map<string,ResourceHandle<any>> {
        return this.handleMap;
    }

    /**
     * Returns the additional data registered for this pass.
     * @returns a value {@link T}
     */
    public getPassData() : T {
        return this.passData;
    }

    public getDependencies() : {write:Set<string>, read:Set<string>} {
        const write = new Set<string>();
        const read = new Set<string>();

        this.accessMap.forEach((access, key) => {
            switch (access) {
                case 'write-only': write.add(key);
                case 'read-only': read.add(key);
                case 'read-write': read.add(key); write.add(key);
            }
        });

        return {write,read};
    }



}