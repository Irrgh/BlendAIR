import { PassBuilder } from "./PassBuilder";
import { PassTimestamp } from "./PassTimestamp";

export class ComputePassBuilder<T> extends PassBuilder<T> {
    
    private pipelineDescriptor?: GPUComputePipelineDescriptor;

    constructor (name:string, passData:T) {
        super(name, passData);
    }

    public compute?: (enc: GPUComputePassEncoder, passData: T) => void;

    /**
     * Sets a callback function to execute draws and dispatches on pass traversal.
     * @param passFunc 
     */
    public setComputeFunc(passFunc:(enc: GPUComputePassEncoder, passData:T) => void) {
        this.compute = passFunc;
    }
    
    public setComputePipelineDescriptor(desc: GPUComputePipelineDescriptor) {
        this.pipelineDescriptor = desc;
    }

    public getComputePipelineDescriptor() : GPUComputePipelineDescriptor {
        if(!this.pipelineDescriptor){
            throw new Error(`Missing pipeline descriptor for compute pass [${this.name}].`);
        }
        return this.pipelineDescriptor;
        
    }


}