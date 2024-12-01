import { PassBuilder } from "./PassBuilder";
import { PassTimestamp } from "./PassTimestamp";

export class ComputePassBuilder extends PassBuilder {
    
    private descriptor : GPUComputePassDescriptor;


    constructor (name:string) {
        super(name);
        this.descriptor = {label:name};
    }


    
    public compute?: (<PassData>(enc: GPUComputePassEncoder, passData: PassData) => {});

    



    /**
     * Sets a callback function to execute draws and dispatches on pass traversal.
     * @param passFunc 
     */
    public setComputeFunc(passFunc:<PassData>(enc: GPUComputePassEncoder, passData:PassData) => {}) {
        this.compute = passFunc;
    }

    /**
     * Executes the compute function of this pass.
     * @param cmd {@link GPUCommandEncoder} to write the commands into
     * @param passData arbitrary data that might be need for rendering.
     */
    public execute<PassData>(cmd: GPUCommandEncoder, passData: PassData): void {
        const enc = cmd.beginComputePass(this.descriptor);
        enc.pushDebugGroup(this.name);

        if (this.compute) {
            this.compute(enc,passData)
        }
        
        enc.popDebugGroup();
        enc.end();
    }

    public attachTimestamp(): PassTimestamp {
        return PassTimestamp.attachTimestamps(this.descriptor,this.name);
    }

}