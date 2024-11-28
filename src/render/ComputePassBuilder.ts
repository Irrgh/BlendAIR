import { PassBuilder } from "./PassBuilder";

export class ComputePassBuilder extends PassBuilder {
    
    constructor () {
        super();
    }


    
    public compute?: (<PassData>(enc: GPUComputePassEncoder, passData: PassData) => {});

    public getPassDescriptor() : GPUComputePassDescriptor {
        throw new Error("Implementation missing");
    }



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
        const enc = cmd.beginComputePass(this.getPassDescriptor());
        enc.pushDebugGroup("TODO: name");

        if (this.compute) {
            this.compute(enc,passData)
        }
        
        enc.popDebugGroup();
        enc.end();
    }

    

}