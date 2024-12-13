import { BufferHandle, ResourceHandle, SamplerHandle, TextureHandle } from './ResourseHandle';

export class PassBuilder<T> {

    protected resourcesRegistry: Set<string>;

    protected textures: Map<string, TextureHandle>;
    protected buffers: Map<string, BufferHandle>;
    protected samplers: Map<string, SamplerHandle>;


    protected bindgroupLayouts: Map<number, GPUBindGroupLayoutDescriptor>;
    protected bindingMap: Map<string, IDFK>;
    protected accessMap: Map<string, ResourceAccess>;
    protected passData: T;

    public readonly name: string;

    constructor(name: string, passData: T) {

        this.resourcesRegistry = new Set();
        this.buffers = new Map();
        this.textures = new Map();
        this.samplers = new Map();



        this.bindgroupLayouts = new Map;
        this.bindingMap = new Map();
        this.accessMap = new Map();
        this.passData = passData;
        this.name = name;
    }

    private ensureResourceUniqueness(name: string) {
        if (this.resourcesRegistry.has(name)) {

        }

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
    public bindBuffer(handle: BufferHandle, group: GPUIndex32, binding: number, visiblity: GPUShaderStageFlags, type: GPUBufferBindingType): BufferHandle {

        const name = handle.name
        const entry: GPUBindGroupLayoutEntry = {
            binding: binding,
            visibility: visiblity,
            buffer: { type: type }
        }

        if (this.bindgroupLayouts.has(group)) {
            this.bindgroupLayouts.set(group, { entries: new Array() });
        }

        const groupLayout = this.bindgroupLayouts.get(group)!;
        (groupLayout.entries as Array<GPUBindGroupLayoutEntry>).push(entry);

        this.bindingMap.set(name, { group, binding, type: "texture" });

        switch (type) {
            case "uniform": this.accessMap.set(name, "read-only");
            case "read-only-storage": this.accessMap.set(name, "read-only");
            case "storage": this.accessMap.set(name, "read-write");
        }

        const existingHandle = this.buffers.get(name);
        if (existingHandle) { return existingHandle; }

        this.buffers.set(name, handle);
        return handle;
    }

    /**
     * Registers a {@link GPUTexture} to be bound in the pipeline.
     * @param handle name of the texture inside the {@link RenderGraph}.
     * @param info declares how the texture should be bound.
     * @returns a updated {@link TextureHandle} to the {@link GPUTexture}.
     */
    public bindTexture(handle: TextureHandle, info: TextureBindingInfo): TextureHandle {

        const name = handle.name;

        if (info.texture && !info.storageTexture && !info.externalTexture) {
            this.accessMap.set(name, "read-only");
            handle.useTextureBinding();
        } else if (!info.texture && info.storageTexture && !info.externalTexture) {
            this.accessMap.set(name, info.storageTexture.access || "write-only");
            handle.useStorageBinding();
        } else if (!info.texture && !info.storageTexture && info.externalTexture) {
            this.accessMap.set(name, "read-only");
            handle.useTextureBinding();
        } else if (!info.texture && !info.storageTexture && !info.externalTexture) {
            throw new Error(`Texture binding error: [${name}] is missing a GPUBindingLayout like texture, storageTexture, externalTexture`);
        } else {
            throw new Error(`Texture binding error: [${name}] has too many layouts: texture, storageTexture, externalTexture are mutually exclusive.`)
        }

        const entry: GPUBindGroupLayoutEntry = {
            binding: info.binding,
            visibility: info.visibility,
            texture: info.texture,
            storageTexture: info.storageTexture,
            externalTexture: info.externalTexture
        }

        if (this.bindgroupLayouts.has(info.group)) {
            this.bindgroupLayouts.set(info.group, { entries: new Array() });
        }

        // TODO: this looks sus
        const groupLayout = this.bindgroupLayouts.get(info.group)!;
        (groupLayout.entries as Array<GPUBindGroupLayoutEntry>).push(entry);
        this.bindingMap.set(name, { group:info.group, binding:info.binding, type: "texture" });

        const existingHandle = this.textures.get(name);
        if (existingHandle) { return existingHandle; }

        this.textures.set(name, handle);
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
    public bindSampler(handle: SamplerHandle, info: SamplerBindingInfo): SamplerHandle {

        const name = handle.name;

        const entry: GPUBindGroupLayoutEntry = {
            binding: info.binding,
            visibility: info.visibility,
            sampler: { type:info.type }
        }

        if (this.bindgroupLayouts.has(info.group)) {
            this.bindgroupLayouts.set(info.group, { entries: new Array() });
        }

        const groupLayout = this.bindgroupLayouts.get(info.group)!;
        (groupLayout.entries as Array<GPUBindGroupLayoutEntry>).push(entry);
        this.bindingMap.set(name, { group:info.group, binding:info.binding, type: "sampler" });

        this.accessMap.set(name, "read-only");

        const existingHandle = this.samplers.get(name);
        if (existingHandle) { return existingHandle; }

        this.samplers.set(name, handle);
        return handle;
    }

    /**
     * Registers a {@link GPUBuffer} to be used in this pass without being bound.
     * @param handle handle of the buffer inside the {@link RenderGraph}
     * @param access resource access of the buffer in this pass.
     * @returns a updated {@link BufferHandle} to the {@link GPUBuffer}.
     */
    public useBuffer(handle: BufferHandle, access: ResourceAccess): BufferHandle {
        this.accessMap.set(handle.name, access);

        const existingHandle = this.buffers.get(handle.name);
        if (existingHandle) { return existingHandle; }
        this.buffers.set(handle.name, handle);
        return handle;
    }

    public useTexture(handle: TextureHandle, access: ResourceAccess): TextureHandle {
        this.accessMap.set(handle.name, access);

        const existingHandle = this.textures.get(handle.name);
        if (existingHandle) { return existingHandle; }
        this.textures.set(handle.name, handle);
        return handle;
    }




    /**
     * Returns the bindgroup layout of this pass.
     * @returns a Map of bindgroup layouts.
     */
    public getBindingLayouts(): Map<number, GPUBindGroupLayoutDescriptor> {
        return this.bindgroupLayouts;
    }

    /**
     * Returns the binding information of the resources used. 
     * @returns a Map of {@link IDFK}.
     */
    public getBindingMap(): Map<string, IDFK> {
        return this.bindingMap;
    }

    /**
     * Returns the resource access of the resources used.
     * @returns a Map of {@link ResourceAccess}
     */
    public getAccessMap(): Map<string, ResourceAccess> {
        return this.accessMap;
    }

    /**
     * Returns the handles of the resources used.
     * @returns a Map of {@link ResourceHandle}
     */
    public getHandleMaps() {
        return {
            buffers: this.buffers,
            textures: this.textures,
            samplers: this.samplers
        }
    }

    /**
     * Returns the additional data registered for this pass.
     * @returns a value {@link T}
     */
    public getPassData(): T {
        return this.passData;
    }

    public getDependencies(): { write: Set<string>, read: Set<string> } {
        const write = new Set<string>();
        const read = new Set<string>();

        this.accessMap.forEach((access, key) => {
            switch (access) {
                case 'write-only': write.add(key);
                case 'read-only': read.add(key);
                case 'read-write': read.add(key); write.add(key);
            }
        });

        return { write, read };
    }



}