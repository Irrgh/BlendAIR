import { PassBuilder } from "./PassBuilder";
export class RenderPassBuilder extends PassBuilder {

    private colorAttachments: RenderPassColorAttachment[];
    private depthStencilAttachment?: RenderPassDepthStencilAttachment;
    private pipelineDescriptor?: RenderPipelineDescriptor;

    constructor(name: string) {
        super(name);
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
     * @param desc 
     */
    public setRenderPipelineDescriptor(desc: RenderPipelineDescriptor) {
        this.pipelineDescriptor = desc;
    }

    public getColorAttachment(): RenderPassColorAttachment[] {
        return this.colorAttachments;
    }

    public getDepthStencilAttachment(): RenderPassDepthStencilAttachment | undefined {
        return this.depthStencilAttachment;
    }

    /**
     * TODO: decide whether to have this nullable or not.
     */
    public getRenderPipelineDescriptor(): RenderPipelineDescriptor {
        if (!this.pipelineDescriptor) {
            throw new Error(`Missing pipeline descriptor for render pass [${this.name}].`);
        }
        return this.pipelineDescriptor;
    }


    public render?: <PassData>(enc: GPURenderPassEncoder, passData: PassData) => {};

    /**
     * Sets a callback function to execute draws and dispatches on pass traversal.
     * @param passFunc 
     */
    public setPassFunc(passFunc: <PassData>(enc: GPURenderPassEncoder, passData: PassData) => {}) {
        this.render = passFunc;
    }

}