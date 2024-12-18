import { BufferHandle, ResourceHandle, SamplerHandle, TextureHandle } from './ResourseHandle';

export class PassBuilder<T> {

    protected resourcesRegistry: Set<string>;

    protected textures: Map<string, TextureHandle>;
    protected buffers: Map<string, BufferHandle>;
    protected samplers: Map<string, SamplerHandle>;


    protected bindgroupLayouts: Map<number, GPUBindGroupLayoutDescriptor>;
    protected bindingMap: Map<number, Map<number,ResourceHandle<any>>>;
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

    /**
     * Registers a {@link GPUBuffer} to be bound in the pipeline.
     * @param handle  of the buffer inside the {@link RenderGraph}.
     * @param group {@link GPUBindGroup} to bind the buffer in.
     * @param binding slot to bind int the {@link GPUBindGroup}
     * @param visiblity visibility in different parts of the shader pipeline
     * @param type type of buffer
     * @returns a updated {@link BufferHandle} to the {@link GPUBuffer}.
     */
    public bindBuffer(handle: BufferHandle, info: BufferBindingInfo): BufferHandle {

        const entry: GPUBindGroupLayoutEntry = {
            binding: info.binding,
            visibility: info.visibility,
            buffer: info.layout
        }

        let access: ResourceAccess;
        switch (info.layout.type) {
            case "uniform": access = "read-only";
            case "read-only-storage": access = "read-only";
            case "storage": access = "read-write";
            default: access = "read-only";
        }

        this.bind(info,handle,entry);
        return this.useBuffer(handle,access);
    }

    /**
     * Registers a {@link GPUTexture} to be bound in the pipeline.
     * @param handle name of the texture inside the {@link RenderGraph}.
     * @param info declares how the texture should be bound.
     * @returns a updated {@link TextureHandle} to the {@link GPUTexture}.
     */
    public bindTexture(handle: TextureHandle, info: TextureBindingInfo): TextureHandle {

        const name = handle.name;
        const {texture:t,storageTexture:s,externalTexture:e} = info;
        let access : ResourceAccess;

        if (t && !s && !e) {                            // only texture
            access = "read-only"
            handle.useTextureBinding();
        } else if (!t && s && !e) {                     // only storageTexture
            access = s.access || "write-only";
            handle.useStorageBinding();
        } else if (!t && !s && info.externalTexture) {  // only externalTexture
            access = "read-only";
            handle.useTextureBinding();
        } else if (!info.texture && !info.storageTexture && !info.externalTexture) {
            throw new Error(`Texture binding error: [${name}] is missing a GPUBindingLayout like texture, storageTexture, externalTexture`);
        } else {
            throw new Error(`Texture binding error: [${name}] has too many layouts: texture, storageTexture, externalTexture are mutually exclusive.`)
        }

        const storage = info.storageTexture ? {...info.storageTexture,format:handle.desc.format} : undefined;

        const entry: GPUBindGroupLayoutEntry = {
            binding: info.binding,
            visibility: info.visibility,
            texture: info.texture,
            storageTexture: storage,
            externalTexture: info.externalTexture
        }

        this.bind(info,handle,entry);
        return this.useTexture(handle,access);
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

        const entry: GPUBindGroupLayoutEntry = {
            binding: info.binding,
            visibility: info.visibility,
            sampler: { type: info.type }
        }

        this.bind(info,handle,entry);
        return this.useSampler(handle);
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

    /**
     * Registers a {@link GPUTexture} to be used in this pass without being bound.
     * @param handle handle of the texture inside the {@link RenderGraph}.
     * @param access a updated {@link TextureHandle} to the {@link GPUTexture}.
     * @returns 
     */
    public useTexture(handle: TextureHandle, access: ResourceAccess): TextureHandle {
        this.accessMap.set(handle.name, access);

        const existingHandle = this.textures.get(handle.name);
        if (existingHandle) { return existingHandle; }
        this.textures.set(handle.name, handle);
        return handle;
    }

    public useSampler(handle: SamplerHandle) : SamplerHandle {
        this.accessMap.set(handle.name, "read-only");

        const existingHandle = this.samplers.get(handle.name);
        if (existingHandle) { return existingHandle }
        this.samplers.set(handle.name, handle);
        return handle;
    }

    /**
     * Binds a {@link ResourceHandle} to a binding in a bindgroup and updates the bindgroup layouts.
     * @param info 
     * @param handle 
     * @param entry 
     */
    private bind (info:BindingInfo, handle:ResourceHandle<any>, entry:GPUBindGroupLayoutEntry):void {
        let group = this.bindingMap.get(info.group);
        if (!group) {
            group = new Map<number,ResourceHandle<any>>();
            this.bindingMap.set(info.group,group);     
        }
        const oldHandle = group.get(info.binding);
        if (oldHandle) {
            throw new Error(`Handle binding overwrite: [${handle}] overwrites [${oldHandle}] at group:${info.group}, binding:${info.binding}`);
        }
        group.set(info.binding,handle);

        
        let groupLayout = this.bindgroupLayouts.get(info.group);
        if (!groupLayout) {
            groupLayout = {entries:[]};
            this.bindgroupLayouts.set(info.group,groupLayout);
        }
        (groupLayout.entries as Array<GPUBindGroupLayoutEntry>).push(entry);
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
     * @returns a Map of {@link BindingTypeInfo}.
     */
    public getGroupBindings(group:number): Map<number, ResourceHandle<any>> {
        const map = this.bindingMap.get(group);
        if (!map) {
            throw new Error(`There is no entry resource bound in the bindgroup ${group}.`)
        }
        return map;
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