import { PassBuilder } from "./PassBuilder";
import { PassTimestamp } from "./PassTimestamp";

export class ComputePassBuilder extends PassBuilder {
    
    private pipelineDescriptor?: GPUComputePipelineDescriptor;

    constructor (name:string) {
        super(name);
    }

    public compute?: <PassData>(enc: GPUComputePassEncoder, passData: PassData) => {};

    
    /**
     * Sets a callback function to execute draws and dispatches on pass traversal.
     * @param passFunc 
     */
    public setComputeFunc(passFunc:<PassData>(enc: GPUComputePassEncoder, passData:PassData) => {}) {
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