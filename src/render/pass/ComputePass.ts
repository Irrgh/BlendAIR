import { Pass } from "./Pass";

export class ComputePass<T> extends Pass<T> {
    protected declare pipeline: GPUComputePipeline;
    protected declare desc: GPUComputePassDescriptor;
    private compute: ComputeFunc<T>;
    
    constructor(name:string, bindgroups: Map<number,GPUBindGroup>, desc: GPUComputePassDescriptor, pipeline: GPUComputePipeline, compute : ComputeFunc<T>) {
        super(name,bindgroups,desc,pipeline);
        this.compute = compute;
    }

    /**
     * Executes the `compute` function after preparing the {@link GPUComputePassEncoder} and setting the {@link GPUBindGroup}s
     * and {@link GPUComputePipeline} in it.
     * @param cmd a {@link GPUCommandEncoder} to record gpu commands.
     * @param passData arbitrary data {@link T} needed for execution.
     */
    public execute(cmd: GPUCommandEncoder, passData: T): void {
        // Debug
        cmd.insertDebugMarker(`${this.name}-pass-debug`);
        cmd.pushDebugGroup(`${this.name}-pass-execution`);

        // Preparation
        const enc = cmd.beginComputePass(this.desc);
        enc.setPipeline(this.pipeline);
        this.bindgroups.forEach((bindgroup : GPUBindGroup, index:number) => {
            enc.setBindGroup(index,bindgroup);
        })

        // Execution
        this.compute(enc,passData);

        cmd.popDebugGroup();
    }
}