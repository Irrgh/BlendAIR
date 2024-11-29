import { App } from '../app';
import { WebGPU } from '../engine/WebGPU';
import { PassTimestamp } from './PassTimestamp';


export type ResourceAccess = GPUStorageTextureAccess


interface BindingInfo {
    group: number,
    binding: number,
    type: "buffer" | "sampler" | "texture"
}




interface TextureBindingLayout {
    texture?: GPUTextureBindingLayout,
    storageTexture?: GPUStorageTextureBindingLayout,
    externalTexture?: GPUExternalTextureBindingLayout,
}






export abstract class PassBuilder {


    private bindingLayouts: GPUBindGroupLayoutDescriptor[];
    private bindingMap: Map<string, BindingInfo>;
    private accessMap: Map<string, ResourceAccess>;

    public readonly name: string;

    constructor(name: string) {
        const device: GPUDevice = App.getRenderDevice();
        device.limits.maxBindGroups

        this.bindingLayouts = new Array();
        this.bindingMap = new Map();
        this.accessMap = new Map();

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
    public bindBuffer(name: string, group: GPUIndex32, binding: number, visiblity: GPUShaderStageFlags, type: GPUBufferBindingType) {

        const entry: GPUBindGroupLayoutEntry = {
            binding: binding,
            visibility: visiblity,
            buffer: { type: type }
        }

        if (!this.bindingLayouts[group]) {
            this.bindingLayouts[group] = { entries: new Array() }
        }

        (this.bindingLayouts[group].entries as Array<GPUBindGroupLayoutEntry>).push(entry);
        this.bindingMap.set(name, { group, binding, type: "texture" });

        switch (type) {
            case "uniform": this.accessMap.set(name, "read-only");
            case "read-only-storage": this.accessMap.set(name, "read-only");
            case "storage": this.accessMap.set(name, "read-write");
        }
    }

    /**
     * Registers a {@link GPUTexture} to be bound in the pipeline.
     * @param name name of the texture inside the {@link RenderGraph}.
     * @param info declares how the texture should be bound.
     */
    public bindTexture(name: string, group: GPUIndex32, binding: number, visibility: GPUShaderStageFlags, textureLayout: TextureBindingLayout) {
        
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

        if (!this.bindingLayouts[group]) {
            this.bindingLayouts[group] = { entries: new Array() }
        }

        (this.bindingLayouts[group].entries as Array<GPUBindGroupLayoutEntry>).push(entry);
        this.bindingMap.set(name, { group, binding, type: "texture" });
    }

    /**
     * Registers a {@link GPUSampler} to be bound in the pipeline.
     * @param name name of the sampler inside the {@link RenderGraph}
     * @param group {@link GPUBindGroup} to bind the buffer in.
     * @param binding slot to bind int the {@link GPUBindGroup}
     * @param visiblity visibility in different parts of the shader pipeline
     * @param type type of sampler
     */
    public bindSamplers(name: string, group: GPUIndex32, binding: number, visibility: GPUShaderStageFlags, type?:GPUSamplerBindingType) {
        
        const entry: GPUBindGroupLayoutEntry = {
            binding: binding,
            visibility: visibility,
            sampler : {type}
        }
        
        if (!this.bindingLayouts[group]) {
            this.bindingLayouts[group] = { entries: new Array() }
        }
        (this.bindingLayouts[group].entries as Array<GPUBindGroupLayoutEntry>).push(entry);
        this.bindingMap.set(name, { group, binding, type: "sampler" });

        this.accessMap.set(name,"read-only");
    }


    public abstract execute<PassData>(cmd: GPUCommandEncoder, passData: PassData): void

    public abstract attachTimestamp(): PassTimestamp

}