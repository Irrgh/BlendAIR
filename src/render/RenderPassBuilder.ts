import { PassBuilder, ResourceAccess } from "./PassBuilder";

export class RenderPassBuilder extends PassBuilder {

    private colorAttachments: Map<string,ResourceAccess>;
    private depthAttachment?: {name:string,access:ResourceAccess};



    constructor () {
        super();
        this.colorAttachments = new Map();


    }




    /**
     * Adds a texture as a color attachment. Shader layout will follow the insertion order.
     * @param name name of the texture to be used as a color attachment.
     * @param access used to manage `loadOp` and `storeOp` in the actual attachment.
     */
    public addColorAttachment(name:string,access:ResourceAccess) {
        if (this.colorAttachments.has(name)) {
            throw new Error(`Color attachment declaration error: [${name}] is already used as color attachment.`)
        }
        this.colorAttachments.set(name,access);
    }

    /**
     * Adds a texture a depth Attachment.
     * @param name name of the texture to be used as a depth attachment.
     * @param access used to manage `loadOp` and `storeOp` in the actual attachment.
     */
    public setDepthAttachment(name:string,access:ResourceAccess) {
        this.depthAttachment =  {name,access};
    }





    public render?: (<PassData>(enc: GPURenderPassEncoder, passData: PassData) => {});

    /**
     * Sets a callback function to execute draws and dispatches on pass traversal.
     * @param passFunc 
     */
    public setPassFunc(passFunc:<PassData>(enc: GPURenderPassEncoder, passData:PassData) => {}) {
        this.render = passFunc;
    }


    private getPassDescriptor():GPURenderPassDescriptor {
        throw new Error("Implementation missing");
    }


    /**
     * Executes the render function of this pass.
     * @param cmd {@link GPUCommandEncoder} to write the commands into
     * @param passData arbitrary data that might be need for rendering.
     */
    public execute<PassData>(cmd: GPUCommandEncoder, passData: PassData): void {
        const enc = cmd.beginRenderPass(this.getPassDescriptor());
        enc.pushDebugGroup("TODO: name");

        if (this.render) {
            this.render(enc, passData);
        }

        enc.popDebugGroup();
        enc.end()
    }


    

}