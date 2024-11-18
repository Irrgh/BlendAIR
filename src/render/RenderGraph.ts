import { RenderPass } from "./pass/RenderPass";
import { RenderPassBuilder } from "./RenderPassBuilder";

/**
 * 
 * When rendering multiple different {@link RenderPass} in a {@link Renderer} there are always some dependencies between the used resources
 * used in the different passes. To avoid an conflicts {@link RenderPass} as an interface also defines input and output resources.
 */
export class RenderGraph {

    private passBuilders: Map<string, RenderPassBuilder> = new Map();
    private textures: Map<string,GPUTextureDescriptor> = new Map();
    private buffers: Map<string, GPUBufferDescriptor> = new Map();



    public addPass<PassData>(name: string): { builder: RenderPassBuilder, data: PassData } {

        if (this.passBuilders.has(name)) {
            throw new Error(`Pass declaration error: [${name}] has already been defined as a pass.`);
        }
        const passBuilder = new RenderPassBuilder();
        this.passBuilders.set(name,passBuilder);

        return { builder: new RenderPassBuilder(), data: {} as PassData };
    }

    public createBuffer(name:string, desc: GPUBufferDescriptor) {
        if (this.buffers.has(name)) {
            throw new Error(`Buffer creation error: [${name}] already exists.`);
        }
        this.buffers.set(name,desc);    
    }




    public createTexture (name: string, desc:GPUTextureDescriptor) {
        if (this.textures.has(name)) {
            throw new Error(`Texture creation error: [${name}] already exists.`);
        }
        this.textures.set(name,desc);
    }




}


