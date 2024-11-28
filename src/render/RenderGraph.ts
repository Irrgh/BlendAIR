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

    private passBuilders: Map<string, PassBuilder> = new Map();
    private textures: Map<string, GPUTextureDescriptor> = new Map();
    private buffers: Map<string, GPUBufferDescriptor> = new Map();

    public addRenderPass<PassData>(name: string): { builder: RenderPassBuilder, data: PassData } {
        if (this.passBuilders.has(name)) {
            throw new Error(`Pass declaration error: [${name}] has already been defined as a pass.`);
        }
        const passBuilder = new RenderPassBuilder();
        this.passBuilders.set(name, passBuilder);

        return { builder: passBuilder, data: {} as PassData };
    }

    public addComputePass<PassData>(name: string): { builder: ComputePassBuilder, data: PassData } {
        if (this.passBuilders.has(name)) {
            throw new Error(`Pass declaration error: [${name}] has already been defined as a pass.`);
        }
        const passBuilder = new ComputePassBuilder();
        this.passBuilders.set(name, passBuilder);

        return { builder: passBuilder, data: {} as PassData };
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

    


}


