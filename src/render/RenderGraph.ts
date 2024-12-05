import { ComputePassBuilder } from "./ComputePassBuilder";
import { RenderPass } from "./pass/RenderPass";
import { PassBuilder } from "./PassBuilder";
import { PassTimestamp } from "./PassTimestamp";
import { RenderPassBuilder } from "./RenderPassBuilder";

/**
 * 
 * When rendering multiple different {@link RenderPass} in a {@link Renderer} there are always some dependencies between the used resources
 * used in the different passes. To avoid an conflicts {@link RenderPass} as an interface also defines input and output resources.
 */
export class RenderGraph {

    private passBuilders: Map<string, PassBuilder<any>> = new Map();
    private textures: Map<string, GPUTextureDescriptor> = new Map();
    private buffers: Map<string, GPUBufferDescriptor> = new Map();
    private exports: Set<string> = new Set();

    public addRenderPass<PassData>(name: string): { builder: RenderPassBuilder<PassData>, data: PassData } {
        if (this.passBuilders.has(name)) {
            throw new Error(`Pass declaration error: [${name}] has already been defined as a pass.`);
        }
        const passData = {} as PassData;

        const passBuilder = new RenderPassBuilder<PassData>(name,passData);
        this.passBuilders.set(name, passBuilder);

        return { builder: passBuilder, data: passData};
    }

    public addComputePass<PassData>(name: string): { builder: ComputePassBuilder<PassData>, data: PassData } {
        if (this.passBuilders.has(name)) {
            throw new Error(`Pass declaration error: [${name}] has already been defined as a pass.`);
        }
        const passData = {} as PassData;

        const passBuilder = new ComputePassBuilder<PassData>(name,passData);
        this.passBuilders.set(name, passBuilder);

        return { builder: passBuilder, data: passData};
    }

    public createBuffer(name: string, desc: GPUBufferDescriptor) {
        if (this.buffers.has(name)) {
            throw new Error(`Buffer creation error: [${name}] already exists.`);
        }
        this.buffers.set(name, desc);
    }

    public createTexture(name: string, desc: GPUTextureDescriptor) {
        if (this.textures.has(name)) {
            throw new Error(`Texture creation error: [${name}] already exists.`);
        }
        this.textures.set(name, desc);
    }

    /**
     * Sets whether a {@link GPUBuffer} or {@link GPUTexture} should be exported after execution of the {@link RenderGraph}.
     * Resources that are not set to be exported might result in passes that provide them being culled.
     * @param name name of the {@link GPUBuffer} | {@link GPUTexture} to export.
     * @param exported 
     */
    public setExport(name:RenderGraphBufferHandle | RenderGraphTextureHandle, exported:boolean) {
        if (exported) {
            this.exports.add(name);
        } else {
            this.exports.delete(name);
        }
    }

    private construct () {
        
        


        



    }
    





}


