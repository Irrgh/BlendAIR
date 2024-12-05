import { PassBuilder } from "./PassBuilder";
export class RenderPassBuilder<T> extends PassBuilder<T> {

    private colorAttachments: RenderPassColorAttachment[];
    private depthStencilAttachment?: RenderPassDepthStencilAttachment;
    private pipelineDescriptor?: RenderPipelineDescriptor;

    constructor(name: string, passData: T) {
        super(name,passData);
        this.colorAttachments = new Array();
    }

    /**
     * Adds a {@link GPURenderPassColorAttachment} to this pass on compilation,
     * after resolving the {@link RenderGraphTextureHandle}s in the {@link RenderGraph}.
     * @param attachment {@link RenderPassColorAttachment}
     */
    public addColorAttachment(attachment:RenderPassColorAttachment) {
        this.colorAttachments.push(attachment);
    }

    /**
     * Sets a {@link RenderPassDepthStencilAttachment} for this on compilation,
     * after resolving the {@link RenderGraphTextureHandle} in the {@link RenderGraph}.
     * @param attachment 
     */
    public setDepthAttachment(attachment:RenderPassDepthStencilAttachment) {
        this.depthStencilAttachment = attachment;
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
    public setPassFunc(passFunc: (enc: GPURenderPassEncoder, passData: T) => void) {
        this.render = passFunc;
    }

    /**
     * Returns the `color attachments` registered for this pass.
     * @returns a list of {@link RenderPassColorAttachment}
     */
    public getColorAttachment(): RenderPassColorAttachment[] {
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

    /**
     * Function to be executed upon rendering this pass.
     */
    public render?: (enc: GPURenderPassEncoder, passData: T) => void;

}