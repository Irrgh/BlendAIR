import { PassBuilder } from "./PassBuilder";
import { TextureHandle } from './ResourceHandle';
export class RenderPassBuilder<T> extends PassBuilder<T> {

    private colorAttachments: Array<RenderPassColorAttachment | null>;
    private depthStencilAttachment?: RenderPassDepthStencilAttachment;
    private pipelineDescriptor?: RenderPipelineDescriptor;
    /**
     * Function to be executed upon rendering this pass.
     */
    private render?: RenderFunc<T>;


    constructor(name: string, passData: T) {
        super(name,passData);
        this.colorAttachments = new Array();
    }

    /**
     * Adds a {@link GPURenderPassColorAttachment} to this pass on compilation,
     * after resolving the {@link RenderGraphTextureHandle}s in the {@link RenderGraph}.
     * @param attachment {@link RenderPassColorAttachment}
     */
    public addColorAttachment(attachment:RenderPassColorAttachment, location:GPUIndex32) {
        this.colorAttachments[location] = attachment;
        
        const view : TextureHandle = attachment.view;
        const resolve : TextureHandle | undefined = attachment.resolveTarget;

        this.useTexture(view,"write-only");
        view.useRenderAttachment();

        if (resolve) {
            this.useTexture(resolve,"write-only");
            resolve.useRenderAttachment();
        }
        
    }

    /**
     * Sets a {@link RenderPassDepthStencilAttachment} for this on compilation,
     * after resolving the {@link RenderGraphTextureHandle} in the {@link RenderGraph}.
     * @param attachment 
     */
    public setDepthAttachment(attachment:RenderPassDepthStencilAttachment) {
        this.depthStencilAttachment = attachment;
        const view : TextureHandle = attachment.view;

    }

    /**
     * Sets a {@link RenderPipelineDescriptor} for this pass on compilation,
     * after resolving the {@link RenderGraphTextureHandle} in the {@link RenderGraph}.
     * @param desc a {@link RenderPipelineDescriptor}
     */
    public setRenderPipelineDescriptor(desc: RenderPipelineDescriptor) {
        this.pipelineDescriptor = desc;
    }

    /**
     * Sets a callback function to execute draws and dispatches on pass traversal.
     * @param passFunc 
     */
    public setPassFunc(passFunc: RenderFunc<T>) {
        this.render = passFunc;
    }

    /**
     * Returns the `color attachments` registered for this pass.
     * @returns a list of {@link RenderPassColorAttachment}
     */
    public getColorAttachments(): Array<RenderPassColorAttachment | null> {
        return this.colorAttachments;
    }

    /**
     * Returns the `depth attachment` registered for this pass.
     * @returns a {@link RenderPassDepthStencilAttachment} or `undefined`.
     */
    public getDepthStencilAttachment(): RenderPassDepthStencilAttachment | undefined {
        return this.depthStencilAttachment;
    }

    /**
     * Returns the {@link RenderPipelineDescriptor} registered for this pass.
     * @returns a {@link RenderPipelineDescriptor}.
     * @throws an {@link Error} when the `pipelineDescriptor` is not set.
     */
    public getRenderPipelineDescriptor(): RenderPipelineDescriptor {
        if (!this.pipelineDescriptor) {
            throw new Error(`Missing pipeline descriptor for render pass [${this.name}].`);
        }
        return this.pipelineDescriptor;
    }

    public getRenderFunc() : RenderFunc<T> {
        if (!this.render) {
            throw new Error(`Render function is not set`);
        }
        return this.render;
    }
    
}