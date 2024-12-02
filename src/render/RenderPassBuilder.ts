import { PassBuilder, ResourceAccess } from "./PassBuilder";
import { PassTimestamp } from "./PassTimestamp";

export class RenderPassBuilder extends PassBuilder {

    private colorAttachments: RenderPassColorAttachment[];
    private depthAttachment?: RenderPassDepthStencilAttachment;
    private descriptor: GPURenderPassDescriptor;
    private pipelineDescriptor?: RenderPipelineDescriptor


    constructor(name: string) {
        super(name);
        this.colorAttachments = new Array();
        this.descriptor = { label: name } as GPURenderPassDescriptor;
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
        this.depthAttachment = attachment;
    }

    /**
     * Sets a {@link RenderPipelineDescriptor} for this pass on compilation,
     * after resolving the {@link RenderGraphTextureHandle} in the {@link RenderGraph}.
     * @param desc 
     */
    public setPipeline(desc: RenderPipelineDescriptor) {
        this.pipelineDescriptor = desc;
    }



    public render?: <PassData>(enc: GPURenderPassEncoder, passData: PassData) => {};

    /**
     * Sets a callback function to execute draws and dispatches on pass traversal.
     * @param passFunc 
     */
    public setPassFunc(passFunc: <PassData>(enc: GPURenderPassEncoder, passData: PassData) => {}) {
        this.render = passFunc;
    }


    /**
     * Executes the render function of this pass. 
     * @param cmd {@link GPUCommandEncoder} to write the commands into
     * @param passData arbitrary data that might be need for rendering.
     */
    public execute<PassData>(cmd: GPUCommandEncoder, passData: PassData): void {
        const enc = cmd.beginRenderPass(this.descriptor);
        enc.pushDebugGroup(this.name);

        if (this.render) {
            this.render(enc, passData);
        }

        enc.popDebugGroup();
        enc.end()
    }

    public attachTimestamp(): PassTimestamp {
        return PassTimestamp.attachTimestamps(this.descriptor, this.name);
    }



}