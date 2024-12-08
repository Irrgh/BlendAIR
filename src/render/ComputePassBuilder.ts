import { PassBuilder } from "./PassBuilder";
import { PassTimestamp } from "./PassTimestamp";

export class ComputePassBuilder<T> extends PassBuilder<T> {
    
    private pipelineDescriptor?: ComputePipelineDescriptor;
    /**
     * Function to be executed when this pass is computed.
     */
    public compute?: ComputeFunc<T>;

    constructor (name:string, passData:T) {
        super(name, passData);
    }

    /**
     * Sets a callback function to execute draws and dispatches on pass traversal.
     * @param passFunc 
     */
    public setComputeFunc(passFunc:ComputeFunc<T>) {
        this.compute = passFunc;
    }

    /**
     * Sets a {@link ComputePipelineDescriptor} for this pass on compilation,
     * after resolving the {@link RenderGraphTextureHandle} in the {@link RenderGraph}.
     * @param desc a {@link ComputePipelineDescriptor}
     */
    public setComputePipelineDescriptor(desc: ComputePipelineDescriptor) {
        this.pipelineDescriptor = desc;
    }

    /**
     * Returns the {@link GPUComputePipelineDescriptor} registered for this pass.
     * @returns a {@link GPUComputePipelineDescriptor}.
     * @throws an {@link Error} when the `pipelineDescriptor` is not set.
     */
    public getComputePipelineDescriptor() : ComputePipelineDescriptor {
        if(!this.pipelineDescriptor){
            throw new Error(`Missing pipeline descriptor for compute pass [${this.name}].`);
        }
        return this.pipelineDescriptor;
        
    }


}